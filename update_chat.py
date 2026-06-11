import os

filepath = "apps/mobile/app/(tabs)/chat.tsx"
with open(filepath, "r") as f:
    content = f.read()

# Add quick actions above the FlatList
quick_actions_code = """        {messages.length === 1 && (
          <View style={styles.quickActionsContainer}>
            {['Plan my day', 'Break down my project', 'Reschedule my week'].map((action, idx) => (
              <TouchableOpacity key={idx} style={[styles.quickActionBtn, { borderColor: colors.separator }]} onPress={() => setInputText(action)}>
                <Text style={[styles.quickActionText, { color: colors.text }]}>{action}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
        <FlatList"""

content = content.replace("<FlatList", quick_actions_code)

# Add small tool call cards
tool_call_render_code = """            {/* Render Tool Calls */}
            {!isUser && item.toolCalls && item.toolCalls.length > 0 && (
              <View style={{ marginTop: 12, gap: 8 }}>
                {item.toolCalls.map((tc, idx) => {
                  if (tc.toolName === 'propose_plan_draft' && tc.args) {
                     return (
                       <PlanDraftCard 
                         key={idx}
                         planTitle={tc.args.plan_title}
                         planObjective={tc.args.plan_objective}
                         items={tc.args.items}
                         isCommitting={isCommittingPlan}
                         onReviewPress={() => {
                           setPreviewPlanData(tc.args);
                         }}
                       />
                     );
                  }
                  // Render generic tool call chip
                  return (
                    <View key={idx} style={[styles.toolCallChip, { backgroundColor: isDark ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.05)' }]}>
                      <Bot size={12} color={colors.textMuted} />
                      <Text style={[styles.toolCallText, { color: colors.textMuted }]}>
                        {tc.toolName === 'create_task' ? `Created Task: ${tc.args.title}` :
                         tc.toolName === 'reschedule_task' ? `Rescheduled Task` :
                         tc.toolName === 'break_down_task' ? `Broken down into ${tc.args.subtasks?.length || 0} subtasks` :
                         tc.toolName === 'create_calendar_block' ? `Created Calendar Block: ${tc.args.title}` :
                         `Ran ${tc.toolName}`}
                      </Text>
                    </View>
                  );
                })}
              </View>
            )}"""

# We need to replace the exact block in chat.tsx
old_tool_call_block = """            {/* Render Tool Calls */}
            {!isUser && item.toolCalls && item.toolCalls.length > 0 && (
              <View style={{ marginTop: 12 }}>
                {item.toolCalls.map((tc, idx) => {
                  if (tc.toolName === 'propose_plan_draft' && tc.args) {
                     return (
                       <PlanDraftCard 
                         key={idx}
                         planTitle={tc.args.plan_title}
                         planObjective={tc.args.plan_objective}
                         items={tc.args.items}
                         isCommitting={isCommittingPlan}
                         onReviewPress={() => {
                           setPreviewPlanData(tc.args);
                         }}
                       />
                     );
                  }
                  return null;
                })}
              </View>
            )}"""

content = content.replace(old_tool_call_block, tool_call_render_code)

# Add missing styles
styles_to_add = """  deleteModalConfirmText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  quickActionsContainer: {
    paddingHorizontal: 16,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  quickActionBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  quickActionText: {
    fontSize: 13,
    fontWeight: '500',
  },
  toolCallChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  toolCallText: {
    fontSize: 11,
    fontWeight: '600',
  },"""

content = content.replace("  deleteModalConfirmText: {\n    color: '#fff',\n    fontSize: 16,\n    fontWeight: '600',\n  },", styles_to_add)

with open(filepath, "w") as f:
    f.write(content)

print("Updated chat.tsx")
