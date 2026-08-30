"use client";

import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  CircularProgress,
  FormHelperText,
} from '@mui/material';
import { GroupAdd as GroupAddIcon } from '@mui/icons-material';
import { useRouter } from 'next/navigation';
import { addTeamToLeague } from '@/lib/actions/league';
import {
  addTeamToLeagueSchema,
  type AddTeamToLeagueInput,
  type SportValue,
} from '@/lib/utils/validation';
import { PageContainer } from '@/components/ui/PageContainer';
import { PageHeader } from '@/components/ui/PageHeader';

interface CreateLeagueTeamFormProps {
  leagueId: string;
  divisions: Array<{
    id: string;
    name: string;
    ageGroup: string | null;
    skillLevel: string | null;
  }>;
  preselectedDivisionId?: string;
}

export default function CreateLeagueTeamForm({
  leagueId,
  divisions,
  preselectedDivisionId
}: CreateLeagueTeamFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof Omit<AddTeamToLeagueInput, 'leagueId'>, string>>>({});

  const [formData, setFormData] = useState<{
    name: string;
    sport: SportValue;
    season: string;
    divisionId: string;
  }>({
    name: '',
    // Spartan is motorsport-only; the sport is fixed rather than picked.
    sport: 'MOTORSPORT',
    season: '',
    divisionId: preselectedDivisionId || '',
  });

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    // Clear errors when user starts typing
    if (error) setError(null);
    if (fieldErrors[field as keyof typeof fieldErrors]) {
      setFieldErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const handleBlur = (field: keyof Omit<AddTeamToLeagueInput, 'leagueId'>) => {
    // Validate individual field on blur
    const fullFormData: AddTeamToLeagueInput = {
      leagueId,
      name: formData.name,
      sport: formData.sport,
      season: formData.season,
      divisionId: formData.divisionId || undefined,
    };

    const validation = addTeamToLeagueSchema.safeParse(fullFormData);
    if (!validation.success) {
      const fieldError = validation.error.issues.find(issue => issue.path[0] === field);
      if (fieldError) {
        setFieldErrors(prev => ({ ...prev, [field]: fieldError.message }));
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setFieldErrors({});

    const fullFormData: AddTeamToLeagueInput = {
      leagueId,
      name: formData.name,
      sport: formData.sport,
      season: formData.season,
      divisionId: formData.divisionId || undefined,
    };

    // Client-side validation with Zod
    const validation = addTeamToLeagueSchema.safeParse(fullFormData);
    if (!validation.success) {
      const errors: Partial<Record<keyof Omit<AddTeamToLeagueInput, 'leagueId'>, string>> = {};
      validation.error.issues.forEach(issue => {
        const field = issue.path[0] as keyof Omit<AddTeamToLeagueInput, 'leagueId'>;
        if (field && !errors[field]) {
          errors[field] = issue.message;
        }
      });
      setFieldErrors(errors);
      setError('Please fix the errors below.');
      return;
    }

    setLoading(true);

    try {
      const result = await addTeamToLeague(validation.data);

      if (result.success) {
        // Redirect to teams page
        router.push(`/league/${leagueId}/teams`);
      } else {
        setError(result.error);
      }
    } catch (error) {
      console.error('Error creating team:', error);
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    router.back();
  };

  return (
    <PageContainer maxWidth="sm">
      <PageHeader
        icon={<GroupAddIcon />}
        title="Create team"
        subtitle="Add a new team to your league"
      />

      <Card>
        <CardContent>
          <form onSubmit={handleSubmit}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {error && (
                <Alert severity="error">
                  {error}
                </Alert>
              )}

              <TextField
                label="Team name"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                onBlur={() => handleBlur('name')}
                required
                fullWidth
                placeholder="e.g., Lightning Bolts"
                disabled={loading}
                error={!!fieldErrors.name}
                helperText={fieldErrors.name}
              />


              <TextField
                label="Season"
                value={formData.season}
                onChange={(e) => handleInputChange('season', e.target.value)}
                onBlur={() => handleBlur('season')}
                required
                fullWidth
                placeholder="e.g., Fall 2025, 2025-2026"
                disabled={loading}
                error={!!fieldErrors.season}
                helperText={fieldErrors.season}
              />

              {divisions.length > 0 && (
                <FormControl fullWidth error={!!fieldErrors.divisionId}>
                  <InputLabel>Division (optional)</InputLabel>
                  <Select
                    value={formData.divisionId}
                    onChange={(e) => handleInputChange('divisionId', e.target.value)}
                    label="Division (optional)"
                    disabled={loading}
                  >
                    <MenuItem value="">
                      <em>No division</em>
                    </MenuItem>
                    {divisions.map((division) => (
                      <MenuItem key={division.id} value={division.id}>
                        <Box>
                          <Typography variant="body2">
                            {division.name}
                          </Typography>
                          {(division.ageGroup || division.skillLevel) && (
                            <Typography variant="caption" color="text.secondary" display="block">
                              {[division.ageGroup, division.skillLevel].filter(Boolean).join(' · ')}
                            </Typography>
                          )}
                        </Box>
                      </MenuItem>
                    ))}
                  </Select>
                  {fieldErrors.divisionId && (
                    <FormHelperText>{fieldErrors.divisionId}</FormHelperText>
                  )}
                </FormControl>
              )}

              <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end', mt: 1 }}>
                <Button
                  variant="text"
                  onClick={handleCancel}
                  disabled={loading}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="contained"
                  disabled={loading}
                  startIcon={loading ? <CircularProgress size={18} color="inherit" /> : null}
                >
                  {loading ? 'Creating…' : 'Create team'}
                </Button>
              </Box>
            </Box>
          </form>
        </CardContent>
      </Card>
    </PageContainer>
  );
}
