"use client";

import React from 'react';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { Box, TableCell, TableRow, type TableRowProps } from '@mui/material';
import { DragIndicator as DragIcon } from '@mui/icons-material';

interface DraggableTeamCardProps {
  id: string;
  children: React.ReactNode;
}

/** Shared handle styling: a grey step on hover, the grab cursor, no lift. */
const handleSx = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  minWidth: 36,
  minHeight: 36,
  borderRadius: 1.5,
  cursor: 'grab',
  color: 'text.secondary',
  transition: 'background-color 0.15s ease, color 0.15s ease',
  touchAction: 'none',
  '&:hover': {
    bgcolor: 'action.hover',
    color: 'text.primary',
  },
  '&:active': { cursor: 'grabbing' },
} as const;

/**
 * Card-shaped draggable wrapper. The handle sits in the top-left corner and
 * appears on hover; while dragging the source fades and the DragOverlay in
 * DragDropTeams carries the visual.
 */
export function DraggableTeamCard({ id, children }: DraggableTeamCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id,
  });

  const style = {
    transform: transform ? CSS.Translate.toString(transform) : undefined,
    opacity: isDragging ? 0.5 : 1,
    cursor: isDragging ? 'grabbing' : 'grab',
    transition: 'opacity 0.2s ease-in-out',
  };

  return (
    <Box
      ref={setNodeRef}
      style={style}
      sx={{
        position: 'relative',
        '&:hover .drag-handle, &:focus-within .drag-handle': {
          opacity: 1,
        },
      }}
    >
      <Box
        {...listeners}
        {...attributes}
        className="drag-handle"
        sx={{
          ...handleSx,
          position: 'absolute',
          top: 8,
          left: 8,
          zIndex: 1,
          opacity: 0,
          transition: 'opacity 0.15s ease, background-color 0.15s ease',
        }}
      >
        <DragIcon fontSize="small" color="inherit" />
      </Box>
      {children}
    </Box>
  );
}

interface DraggableTeamRowProps extends Omit<TableRowProps, 'id'> {
  id: string;
  /** Accessible name for the drag handle, e.g. "Drag Lightning Bolts". */
  handleLabel: string;
  children: React.ReactNode;
}

/**
 * Table-row flavour of the same draggable: the first cell is the handle so a
 * dense table of teams can be reordered between divisions without leaving the
 * table idiom. No transform is applied to the row — the DragOverlay carries
 * the visual — so the table never reflows mid-drag.
 */
export function DraggableTeamRow({ id, handleLabel, children, sx, ...rowProps }: DraggableTeamRowProps) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id });

  return (
    <TableRow
      ref={setNodeRef}
      hover
      {...rowProps}
      sx={[
        {
          opacity: isDragging ? 0.4 : 1,
          transition: 'opacity 0.15s ease',
        },
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
    >
      <TableCell padding="none" sx={{ width: 44, pl: 0.5 }}>
        <Box
          {...listeners}
          {...attributes}
          aria-label={handleLabel}
          className="drag-handle"
          sx={handleSx}
        >
          <DragIcon fontSize="small" color="inherit" />
        </Box>
      </TableCell>
      {children}
    </TableRow>
  );
}
