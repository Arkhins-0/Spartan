"use client";

/**
 * DrawingToolbar Component
 *
 * Provides tool selection and drawing options for the RinkBoard component.
 * Includes tool buttons, color picker, undo/redo, and clear canvas functionality.
 *
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5
 */

import React, { useState } from "react";
import {
    Box,
    Paper,
    ToggleButtonGroup,
    ToggleButton,
    IconButton,
    Tooltip,
    Popover,
    Stack,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
} from "@mui/material";
import {
    PanTool as SelectIcon,
    PersonAdd as PlayerIcon,
    Timeline as LineIcon,
    ShowChart as CurveIcon,
    ArrowForward as ArrowIcon,
    TextFields as TextIcon,
    Delete as EraserIcon,
    Undo as UndoIcon,
    Redo as RedoIcon,
    Clear as ClearIcon,
    Palette as PaletteIcon,
} from "@mui/icons-material";
import { DrawingTool } from "@/types/practice-planner";

/**
 * Props for the DrawingToolbar component
 */
export interface DrawingToolbarProps {
    selectedTool: DrawingTool;
    selectedColor: string;
    onToolChange: (tool: DrawingTool) => void;
    onColorChange: (color: string) => void;
    onUndo: () => void;
    onRedo: () => void;
    onClear: () => void;
    canUndo: boolean;
    canRedo: boolean;
}

/**
 * Calculate relative luminance of a color for contrast decisions
 * Uses WCAG 2.0 formula: https://www.w3.org/TR/WCAG20/#relativeluminancedef
 * @param hexColor - Hex color string (e.g., "#FFFFFF")
 * @returns Relative luminance value between 0 (black) and 1 (white)
 */
function getRelativeLuminance(hexColor: string): number {
    // Remove # if present
    const hex = hexColor.replace("#", "");

    // Parse RGB components
    const r = parseInt(hex.substring(0, 2), 16) / 255;
    const g = parseInt(hex.substring(2, 4), 16) / 255;
    const b = parseInt(hex.substring(4, 6), 16) / 255;

    // Apply gamma correction
    const toLinear = (c: number) =>
        c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);

    const rLinear = toLinear(r);
    const gLinear = toLinear(g);
    const bLinear = toLinear(b);

    // Calculate relative luminance
    return 0.2126 * rLinear + 0.7152 * gLinear + 0.0722 * bLinear;
}

/**
 * Get contrasting text color (black or white) based on background luminance
 * @param backgroundColor - Hex color of the background
 * @returns "#000000" for light backgrounds, "#FFFFFF" for dark backgrounds
 */
function getContrastingColor(backgroundColor: string): string {
    const luminance = getRelativeLuminance(backgroundColor);
    // Use 0.5 as threshold (midpoint between black=0 and white=1)
    return luminance > 0.5 ? "#000000" : "#FFFFFF";
}

/**
 * Predefined color palette for drawing.
 * These are ink colours the coach draws with on the rink — user content, not
 * UI chrome — so they stay as literal values.
 * Requirements: 5.2
 */
const COLOR_PALETTE = [
    "#000000", // Black
    "#FF0000", // Red
    "#0000FF", // Blue
    "#00FF00", // Green
    "#FFFF00", // Yellow
    "#FF00FF", // Magenta
    "#00FFFF", // Cyan
    "#FFA500", // Orange
    "#800080", // Purple
    "#FFFFFF", // White
];

/**
 * DrawingToolbar Component
 *
 * A flat card strip of 36px icon toggles: the selected tool is a step of
 * grey (the theme's ToggleButton "selected" rule), never a coloured fill.
 *
 * Requirements: 5.1 - Tool selection for line and curve tools
 * Requirements: 5.2 - Color selection for drawings
 * Requirements: 5.3 - Clear canvas functionality
 * Requirements: 5.4 - Eraser tool
 * Requirements: 5.5 - Undo/redo functionality
 */
export function DrawingToolbar({
    selectedTool,
    selectedColor,
    onToolChange,
    onColorChange,
    onUndo,
    onRedo,
    onClear,
    canUndo,
    canRedo,
}: DrawingToolbarProps) {
    // State for color picker popover
    const [colorAnchorEl, setColorAnchorEl] = useState<HTMLButtonElement | null>(null);
    const colorPickerOpen = Boolean(colorAnchorEl);

    // State for clear confirmation dialog
    // Requirements: 5.3
    const [clearDialogOpen, setClearDialogOpen] = useState(false);

    /**
     * Handle tool selection
     * Requirements: 5.1, 5.4
     */
    const handleToolChange = (
        _event: React.MouseEvent<HTMLElement>,
        newTool: DrawingTool | null
    ) => {
        if (newTool !== null) {
            onToolChange(newTool);
        }
    };

    /**
     * Handle color picker button click
     * Requirements: 5.2
     */
    const handleColorPickerClick = (event: React.MouseEvent<HTMLButtonElement>) => {
        setColorAnchorEl(event.currentTarget);
    };

    /**
     * Handle color picker close
     */
    const handleColorPickerClose = () => {
        setColorAnchorEl(null);
    };

    /**
     * Handle color selection
     * Requirements: 5.2
     */
    const handleColorSelect = (color: string) => {
        onColorChange(color);
        handleColorPickerClose();
    };

    /**
     * Handle clear button click - show confirmation dialog
     * Requirements: 5.3
     */
    const handleClearClick = () => {
        setClearDialogOpen(true);
    };

    /**
     * Handle clear confirmation
     * Requirements: 5.3
     */
    const handleClearConfirm = () => {
        onClear();
        setClearDialogOpen(false);
    };

    /**
     * Handle clear cancellation
     */
    const handleClearCancel = () => {
        setClearDialogOpen(false);
    };

    return (
        <>
            <Paper
                sx={{
                    display: "flex",
                    flexWrap: "wrap",
                    alignItems: "center",
                    gap: 1,
                    px: 1.5,
                    py: 1,
                }}
            >
                {/* Drawing Tools */}
                {/* Requirements: 5.1 - Tool selection buttons with active state */}
                <ToggleButtonGroup
                    value={selectedTool}
                    exclusive
                    onChange={handleToolChange}
                    aria-label="drawing tools"
                    size="small"
                    sx={{
                        flexWrap: "wrap",
                        "& .MuiToggleButton-root": { minWidth: 36, minHeight: 36, px: 1 },
                        "& .MuiSvgIcon-root": { fontSize: 18 },
                    }}
                >
                    <Tooltip title="Select">
                        <ToggleButton value="select" aria-label="select tool">
                            <SelectIcon />
                        </ToggleButton>
                    </Tooltip>
                    <Tooltip title="Add player">
                        <ToggleButton value="player" aria-label="player tool">
                            <PlayerIcon />
                        </ToggleButton>
                    </Tooltip>
                    <Tooltip title="Draw line">
                        <ToggleButton value="line" aria-label="line tool">
                            <LineIcon />
                        </ToggleButton>
                    </Tooltip>
                    <Tooltip title="Draw curve">
                        <ToggleButton value="curve" aria-label="curve tool">
                            <CurveIcon />
                        </ToggleButton>
                    </Tooltip>
                    <Tooltip title="Draw arrow">
                        <ToggleButton value="arrow" aria-label="arrow tool">
                            <ArrowIcon />
                        </ToggleButton>
                    </Tooltip>
                    <Tooltip title="Add text">
                        <ToggleButton value="text" aria-label="text tool">
                            <TextIcon />
                        </ToggleButton>
                    </Tooltip>
                    <Tooltip title="Eraser">
                        <ToggleButton value="eraser" aria-label="eraser tool">
                            <EraserIcon />
                        </ToggleButton>
                    </Tooltip>
                </ToggleButtonGroup>

                <Box
                    aria-hidden
                    sx={{
                        width: "1px",
                        alignSelf: "stretch",
                        bgcolor: "divider",
                        mx: 0.5,
                        display: { xs: "none", sm: "block" },
                    }}
                />

                {/* Color Picker */}
                {/* Requirements: 5.2 - Color picker for drawing colors. The
                    swatch is the coach's chosen ink, so it is the one place
                    a literal colour is painted on chrome. */}
                <Tooltip title="Choose colour">
                    <IconButton
                        onClick={handleColorPickerClick}
                        aria-label="color picker"
                        size="small"
                        sx={{
                            border: "1px solid var(--sp-border-input)",
                            backgroundColor: selectedColor,
                            "&:hover": {
                                backgroundColor: selectedColor,
                                opacity: 0.85,
                            },
                        }}
                    >
                        <PaletteIcon
                            fontSize="small"
                            sx={{
                                color: getContrastingColor(selectedColor),
                            }}
                        />
                    </IconButton>
                </Tooltip>

                {/* Undo/Redo Buttons */}
                {/* Requirements: 5.5 - Undo/redo buttons with disabled states */}
                <Stack direction="row" spacing={0.5}>
                    <Tooltip title="Undo (Ctrl+Z)">
                        <span>
                            <IconButton
                                onClick={onUndo}
                                disabled={!canUndo}
                                aria-label="undo"
                                size="small"
                            >
                                <UndoIcon fontSize="small" />
                            </IconButton>
                        </span>
                    </Tooltip>
                    <Tooltip title="Redo (Ctrl+Shift+Z)">
                        <span>
                            <IconButton
                                onClick={onRedo}
                                disabled={!canRedo}
                                aria-label="redo"
                                size="small"
                            >
                                <RedoIcon fontSize="small" />
                            </IconButton>
                        </span>
                    </Tooltip>
                </Stack>

                {/* Clear Canvas Button */}
                {/* Requirements: 5.3 - Clear canvas button with confirmation */}
                <Tooltip title="Clear canvas">
                    <IconButton
                        onClick={handleClearClick}
                        aria-label="clear canvas"
                        color="error"
                        size="small"
                        sx={{ ml: "auto" }}
                    >
                        <ClearIcon fontSize="small" />
                    </IconButton>
                </Tooltip>
            </Paper>

            {/* Color Picker Popover */}
            {/* Requirements: 5.2 - Color selection interface */}
            <Popover
                open={colorPickerOpen}
                anchorEl={colorAnchorEl}
                onClose={handleColorPickerClose}
                anchorOrigin={{
                    vertical: "bottom",
                    horizontal: "center",
                }}
                transformOrigin={{
                    vertical: "top",
                    horizontal: "center",
                }}
            >
                <Box sx={{ p: 1.5 }}>
                    <Stack direction="row" flexWrap="wrap" useFlexGap spacing={1} sx={{ maxWidth: 220 }}>
                        {COLOR_PALETTE.map((color) => (
                            <IconButton
                                key={color}
                                onClick={() => handleColorSelect(color)}
                                size="small"
                                sx={{
                                    width: 36,
                                    height: 36,
                                    backgroundColor: color,
                                    border: "1px solid var(--sp-border-input)",
                                    outline: color === selectedColor ? "2px solid var(--sp-ring)" : "none",
                                    outlineOffset: 1,
                                    "&:hover": {
                                        backgroundColor: color,
                                        opacity: 0.85,
                                    },
                                }}
                                aria-label={`select color ${color}`}
                            />
                        ))}
                    </Stack>
                </Box>
            </Popover>

            {/* Clear Confirmation Dialog */}
            {/* Requirements: 5.3 - Confirmation dialog for clear action */}
            <Dialog
                open={clearDialogOpen}
                onClose={handleClearCancel}
                aria-labelledby="clear-dialog-title"
            >
                <DialogTitle id="clear-dialog-title">Clear Canvas?</DialogTitle>
                <DialogContent>
                    Are you sure you want to clear all drawings? This action cannot be undone.
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleClearCancel} variant="text">
                        Cancel
                    </Button>
                    <Button onClick={handleClearConfirm} color="error" variant="contained">
                        Clear
                    </Button>
                </DialogActions>
            </Dialog>
        </>
    );
}
