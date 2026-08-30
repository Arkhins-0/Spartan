"use client";

import React, { useState, useEffect } from 'react';
import { formatSport } from "@/lib/utils/validation";
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
} from '@dnd-kit/core';
import { Box, Typography, Paper } from '@mui/material';
import { Groups as TeamsIcon, DragIndicator as DragIcon } from '@mui/icons-material';
import { assignTeamToDivision } from '@/lib/actions/league';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/ui/Toast';

interface Team {
  id: string;
  name: string;
  sport: string;
  season: string;
  createdAt: Date;
  _count: {
    players: number;
    events: number;
  };
}

interface Division {
  id: string;
  name: string;
  ageGroup: string | null;
  skillLevel: string | null;
  teams: Team[];
}

interface DragDropTeamsProps {
  leagueId: string;
  divisions: Division[];
  unassignedTeams: Team[];
  children: (props: {
    divisions: Division[];
    unassignedTeams: Team[];
    activeTeam: Team | null;
  }) => React.ReactNode;
}

export default function DragDropTeams({
  leagueId,
  divisions: initialDivisions,
  unassignedTeams: initialUnassigned,
  children,
}: DragDropTeamsProps) {
  const router = useRouter();
  const { showError, showSuccess } = useToast();
  const [activeTeam, setActiveTeam] = useState<Team | null>(null);
  const [divisions, setDivisions] = useState(initialDivisions);
  const [unassignedTeams, setUnassignedTeams] = useState(initialUnassigned);

  // Sync state with props when they change
  useEffect(() => {
    setDivisions(initialDivisions);
  }, [initialDivisions]);

  useEffect(() => {
    setUnassignedTeams(initialUnassigned);
  }, [initialUnassigned]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // 8px movement required to start drag
      },
    }),
    useSensor(KeyboardSensor)
  );

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;

    // Find the team being dragged
    const team = findTeamById(active.id as string);
    setActiveTeam(team);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTeam(null);

    if (!over || active.id === over.id) {
      return;
    }

    const teamId = active.id as string;
    const targetDivisionId = over.id === 'unassigned' ? null : (over.id as string);

    // Optimistic update
    updateTeamDivisionLocally(teamId, targetDivisionId);

    // Perform server update
    try {
      const result = await assignTeamToDivision({
        leagueId,
        teamId,
        divisionId: targetDivisionId,
      });

      if (!result.success) {
        // Revert on error
        setDivisions(initialDivisions);
        setUnassignedTeams(initialUnassigned);
        console.error('Failed to update team division:', result.error);
        showError(result.error || 'Failed to move team. Please try again.');
      } else {
        // Refresh to ensure data consistency
        showSuccess('Team successfully moved!');
        router.refresh();
      }
    } catch (error) {
      // Revert on error
      setDivisions(initialDivisions);
      setUnassignedTeams(initialUnassigned);
      console.error('Error updating team division:', error);
      showError('An unexpected error occurred while moving the team.');
    }
  };

  const findTeamById = (teamId: string): Team | null => {
    // Check divisions
    for (const division of divisions) {
      const team = division.teams.find(t => t.id === teamId);
      if (team) return team;
    }
    // Check unassigned
    return unassignedTeams.find(t => t.id === teamId) || null;
  };

  const updateTeamDivisionLocally = (teamId: string, newDivisionId: string | null) => {
    const team = findTeamById(teamId);
    if (!team) return;

    // Remove team from current location
    const newDivisions = divisions.map(division => ({
      ...division,
      teams: division.teams.filter(t => t.id !== teamId),
    }));
    const newUnassigned = unassignedTeams.filter(t => t.id !== teamId);

    // Add team to new location
    if (newDivisionId === null) {
      newUnassigned.push(team);
    } else {
      const targetDivision = newDivisions.find(d => d.id === newDivisionId);
      if (targetDivision) {
        targetDivision.teams.push(team);
      }
    }

    setDivisions(newDivisions);
    setUnassignedTeams(newUnassigned);
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      {children({ divisions, unassignedTeams, activeTeam })}

      <DragOverlay dropAnimation={{ duration: 200, easing: 'ease' }}>
        {activeTeam ? (
          // The lifted row: the same card + hairline as everything else, with
          // the hairline in the write colour so it reads as "in hand".
          <Paper
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1.5,
              px: 1.5,
              py: 1,
              cursor: 'grabbing',
              borderColor: 'primary.main',
              bgcolor: 'background.paper',
            }}
          >
            <DragIcon fontSize="small" sx={{ color: 'text.secondary' }} />
            <TeamsIcon fontSize="small" sx={{ color: 'text.secondary' }} />
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="body2" sx={{ fontWeight: 600 }} noWrap>
                {activeTeam.name}
              </Typography>
              <Typography variant="caption" color="text.secondary" noWrap display="block">
                {formatSport(activeTeam.sport)} · {activeTeam.season} · {activeTeam._count.players} players
              </Typography>
            </Box>
          </Paper>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
