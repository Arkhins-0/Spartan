"use client";

import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { Box } from '@mui/material';

interface DroppableDivisionProps {
  id: string;
  children: React.ReactNode;
  isEmpty?: boolean;
}

/**
 * Drop target for a division. The "over" state is a border-colour change to
 * `primary.main` plus the `action.hover` surface — never a shadow, a coloured
 * fill, or a scale — so it reads the same in both schemes.
 */
export function DroppableDivision({ id, children, isEmpty = false }: DroppableDivisionProps) {
  const { isOver, setNodeRef } = useDroppable({
    id,
  });

  return (
    <Box
      ref={setNodeRef}
      sx={{
        minHeight: isEmpty ? 96 : 'auto',
        borderRadius: 2,
        border: '1px dashed',
        borderColor: isOver ? 'primary.main' : 'transparent',
        bgcolor: isOver ? 'action.hover' : 'transparent',
        transition: 'border-color 0.15s ease, background-color 0.15s ease',
        '@media (prefers-reduced-motion: reduce)': { transition: 'none' },
      }}
    >
      {children}
    </Box>
  );
}
