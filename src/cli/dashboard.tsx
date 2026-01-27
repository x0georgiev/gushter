import { useState, useEffect } from 'react';
import { render, Box, Text } from 'ink';
import Spinner from 'ink-spinner';
import { GushterState, Iteration, IterationStatus } from '../types/state.js';
import { Prd, UserStory } from '../types/prd.js';

interface DashboardProps {
  state: GushterState;
  prd: Prd;
  currentStory: UserStory | null;
  isRunning: boolean;
}

function getStatusIcon(status: IterationStatus): string {
  switch (status) {
    case 'completed':
      return '✓';
    case 'in_progress':
      return '●';
    case 'failed':
      return '✗';
    case 'blocked':
      return '⊘';
    case 'rolled_back':
      return '↺';
    default:
      return '○';
  }
}

function getStatusColor(status: IterationStatus): string {
  switch (status) {
    case 'completed':
      return 'green';
    case 'in_progress':
      return 'yellow';
    case 'failed':
      return 'red';
    case 'blocked':
      return 'magenta';
    case 'rolled_back':
      return 'gray';
    default:
      return 'white';
  }
}

function ProgressBar({
  current,
  total,
  width = 30,
}: {
  current: number;
  total: number;
  width?: number;
}) {
  const filled = Math.round((current / total) * width);
  const empty = width - filled;

  return (
    <Text>
      <Text color="green">{'█'.repeat(filled)}</Text>
      <Text color="gray">{'░'.repeat(empty)}</Text>
      <Text> {current}/{total}</Text>
    </Text>
  );
}

function StoryList({
  stories,
  blockedStories,
  iterations,
}: {
  stories: UserStory[];
  blockedStories: string[];
  iterations: Iteration[];
}) {
  const sortedStories = [...stories].sort((a, b) => a.priority - b.priority);

  return (
    <Box flexDirection="column" marginTop={1}>
      <Text bold underline>
        Stories
      </Text>
      {sortedStories.map((story) => {
        const iteration = iterations.find((i) => i.storyId === story.id);
        const isBlocked = blockedStories.includes(story.id);

        let status: IterationStatus = 'pending';
        if (story.passes) {
          status = 'completed';
        } else if (isBlocked) {
          status = 'blocked';
        } else if (iteration) {
          status = iteration.status;
        }

        const icon = getStatusIcon(status);
        const color = getStatusColor(status);

        return (
          <Box key={story.id}>
            <Text color={color}>{icon} </Text>
            <Text color="cyan">[{story.priority}] </Text>
            <Text bold>{story.id}</Text>
            <Text>: {story.title}</Text>
            {iteration && iteration.retryCount > 0 && (
              <Text color="yellow"> (retries: {iteration.retryCount})</Text>
            )}
          </Box>
        );
      })}
    </Box>
  );
}

function CurrentIteration({
  story,
  isRunning,
}: {
  story: UserStory | null;
  isRunning: boolean;
}) {
  if (!story) {
    return (
      <Box marginTop={1}>
        <Text color="gray">No active iteration</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" marginTop={1}>
      <Text bold underline>
        Current Iteration
      </Text>
      <Box>
        {isRunning && (
          <Text color="yellow">
            <Spinner type="dots" />{' '}
          </Text>
        )}
        <Text>
          Working on <Text bold color="cyan">{story.id}</Text>: {story.title}
        </Text>
      </Box>
    </Box>
  );
}

export function Dashboard({ state, prd, currentStory, isRunning }: DashboardProps) {
  const completedCount = prd.userStories.filter((s) => s.passes).length;
  const totalCount = prd.userStories.length;

  return (
    <Box flexDirection="column" padding={1}>
      <Box borderStyle="round" borderColor="blue" paddingX={2} paddingY={1}>
        <Text bold color="blue">
          🤖 Gushter - Autonomous AI Agent Loop
        </Text>
      </Box>

      <Box flexDirection="column" marginTop={1}>
        <Text>
          <Text bold>Project:</Text> {prd.project}
        </Text>
        <Text>
          <Text bold>Branch:</Text> {state.branchName}
        </Text>
        <Text>
          <Text bold>Iteration:</Text> {state.currentIteration}/{state.maxIterations}
        </Text>
      </Box>

      <Box marginTop={1}>
        <Text bold>Progress: </Text>
        <ProgressBar current={completedCount} total={totalCount} />
      </Box>

      {state.blockedStories.length > 0 && (
        <Box marginTop={1}>
          <Text color="red" bold>
            ⚠ Blocked: {state.blockedStories.join(', ')}
          </Text>
        </Box>
      )}

      <CurrentIteration
        story={currentStory}
        isRunning={isRunning}
      />

      <StoryList
        stories={prd.userStories}
        blockedStories={state.blockedStories}
        iterations={state.iterations}
      />
    </Box>
  );
}

export interface DashboardInstance {
  update: (props: Partial<DashboardProps>) => void;
  unmount: () => void;
}

export function createDashboard(initialProps: DashboardProps): DashboardInstance {
  let currentProps = { ...initialProps };

  const App = () => {
    const [props, setProps] = useState(currentProps);

    useEffect(() => {
      const interval = setInterval(() => {
        if (currentProps !== props) {
          setProps({ ...currentProps });
        }
      }, 100);
      return () => clearInterval(interval);
    }, [props]);

    return <Dashboard {...props} />;
  };

  const { unmount } = render(<App />);

  return {
    update: (newProps: Partial<DashboardProps>) => {
      currentProps = { ...currentProps, ...newProps };
    },
    unmount,
  };
}
