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
import { composioLinearSettingsBodySchema, parseJsonBody } from '@/lib/api/schemas';

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
  } catch {
    return NextResponse.json(
      { error: 'Failed to load Linear settings' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const gate = await requireProComposioUser(request);
  if (gate.error) return gate.error;
  const user = gate.user;

  try {
    const body = await request.json().catch(() => ({}));
    const parsed = parseJsonBody(composioLinearSettingsBodySchema, body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }
    const { teamIds, projectIds, includeCompleted, assigneeFilter } = parsed.data;

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
    console.error('Error saving Linear settings:', err);
    return NextResponse.json(
      { error: 'Failed to save Linear settings' },
      { status: 500 }
    );
  }
}
