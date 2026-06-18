import { NextRequest, NextResponse } from 'next/server';
import {
  executeComposioToolAttempts,
  extractLinearProjects,
  extractLinearTeams,
  LINEAR_LIST_PROJECTS_ATTEMPTS,
  LINEAR_LIST_TEAMS_ATTEMPTS,
  mapLinearProjectOptions,
  mapLinearTeamOptions,
} from '@/lib/integrations/composio/providerTools';
import {
  buildLinearMetadataPatch,
  parseLinearPreferences,
  resolvePickerSelection,
} from '@/lib/integrations/composio/preferences';
import { requireProComposioUser } from '@/lib/integrations/composio/requirePro';
import {
  getIntegrationAccount,
  upsertIntegrationAccount,
} from '@/lib/integrations/accounts';

export async function GET(request: NextRequest) {
  const gate = await requireProComposioUser(request);
  if (gate.error) return gate.error;
  const user = gate.user;

  try {
    const account = await getIntegrationAccount(user.id, 'linear');
    const prefs = parseLinearPreferences(account?.metadata);

    const [teamsResult, projectsResult] = await Promise.all([
      executeComposioToolAttempts(user.id, LINEAR_LIST_TEAMS_ATTEMPTS),
      executeComposioToolAttempts(user.id, LINEAR_LIST_PROJECTS_ATTEMPTS),
    ]);

    if (!teamsResult.successful && !projectsResult.successful) {
      return NextResponse.json({
        teams: [],
        projects: [],
        preferences: prefs,
        error:
          teamsResult.error ??
          projectsResult.error ??
          'Could not load Linear workspace data.',
      });
    }

    const teamRecords = teamsResult.successful
      ? extractLinearTeams(teamsResult.data)
      : [];
    const projectRecords = projectsResult.successful
      ? extractLinearProjects(projectsResult.data)
      : [];

    const allTeamIds = teamRecords.map((team) => String(team.id));
    const allProjectIds = projectRecords.map((project) => String(project.id));
    const selectedTeamIds = resolvePickerSelection(
      prefs.team_ids,
      prefs.configured,
      allTeamIds
    );
    const selectedProjectIds = resolvePickerSelection(
      prefs.project_ids,
      prefs.configured,
      allProjectIds
    );

    return NextResponse.json({
      teams: mapLinearTeamOptions(teamRecords, selectedTeamIds),
      projects: mapLinearProjectOptions(projectRecords, selectedProjectIds),
      preferences: {
        include_completed: prefs.include_completed,
        assignee_filter: prefs.assignee_filter,
        configured: prefs.configured,
      },
      error:
        !teamsResult.successful || !projectsResult.successful
          ? teamsResult.error ?? projectsResult.error
          : undefined,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to load Linear settings' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const gate = await requireProComposioUser(request);
  if (gate.error) return gate.error;
  const user = gate.user;

  try {
    const body = await request.json();
    const teamIds: string[] = Array.isArray(body?.teamIds) ? body.teamIds.map(String) : [];
    const projectIds: string[] = Array.isArray(body?.projectIds)
      ? body.projectIds.map(String)
      : [];
    const includeCompleted = body?.includeCompleted === true;
    const assigneeFilter = body?.assigneeFilter === 'me' ? 'me' : 'all';

    const account = await getIntegrationAccount(user.id, 'linear');
    const metadata = buildLinearMetadataPatch(account?.metadata, {
      team_ids: teamIds,
      project_ids: projectIds,
      include_completed: includeCompleted,
      assignee_filter: assigneeFilter,
    });

    await upsertIntegrationAccount({
      userId: user.id,
      provider: 'linear',
      status: 'connected',
      metadata,
    });

    return NextResponse.json({
      success: true,
      teamIds,
      projectIds,
      includeCompleted,
      assigneeFilter,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to save Linear settings' },
      { status: 500 }
    );
  }
}
