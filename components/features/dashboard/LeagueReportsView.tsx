"use client";

import React, { useState } from 'react';
import {
    Alert,
    Box,
    Button,
    Card,
    CardContent,
    CardHeader,
    Chip,
    CircularProgress,
    Stack,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Typography,
} from '@mui/material';
import {
    Download as DownloadIcon,
    PictureAsPdf as PdfIcon,
    People as PeopleIcon,
    Event as EventIcon,
    Assessment as AssessmentIcon,
    AttachMoney as MoneyIcon,
} from '@mui/icons-material';
import {
    exportLeagueRosterCSV,
    exportLeagueRosterPDF,
    exportLeagueScheduleCSV,
    exportLeagueSchedulePDF,
    exportAttendanceReportCSV,
    exportAttendanceReportPDF,
    exportFinancialReportCSV,
    exportFinancialReportPDF,
} from '@/lib/actions/league';
import { PageContainer } from '@/components/ui/PageContainer';
import { PageHeader } from '@/components/ui/PageHeader';

interface LeagueReportsViewProps {
    leagueId: string;
    isAdmin: boolean;
}

type ReportExportResult =
    | { success: true; data: { csv: string; filename: string } | { pdfBase64: string; filename: string } }
    | { success: false; error: string; details?: unknown };

type ReportExportAction = () => Promise<ReportExportResult>;

export default function LeagueReportsView({ leagueId, isAdmin }: LeagueReportsViewProps) {
    const [loading, setLoading] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const downloadCSV = (csv: string, filename: string) => {
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        downloadBlob(blob, filename);
    };

    const downloadPDF = (pdfBase64: string, filename: string) => {
        const binary = atob(pdfBase64);
        const bytes = new Uint8Array(binary.length);

        for (let index = 0; index < binary.length; index += 1) {
            bytes[index] = binary.charCodeAt(index);
        }

        const blob = new Blob([bytes], { type: 'application/pdf' });
        downloadBlob(blob, filename);
    };

    const downloadBlob = (blob: Blob, filename: string) => {
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    const handleExport = async (
        reportId: string,
        format: 'csv' | 'pdf',
        action: ReportExportAction,
        fallbackError: string
    ) => {
        setLoading(`${reportId}-${format}`);
        setError(null);

        try {
            const result = await action();
            if (result.success) {
                if ('csv' in result.data) {
                    downloadCSV(result.data.csv, result.data.filename);
                } else {
                    downloadPDF(result.data.pdfBase64, result.data.filename);
                }
            } else {
                setError(result.error);
            }
        } catch {
            setError(fallbackError);
        } finally {
            setLoading(null);
        }
    };

    const reports = [
        {
            id: 'roster',
            title: 'League roster',
            description: 'Complete roster with all players across all teams',
            icon: PeopleIcon,
            csvAction: () => exportLeagueRosterCSV(leagueId),
            pdfAction: () => exportLeagueRosterPDF(leagueId),
            fallbackError: 'Failed to export roster',
            adminOnly: false,
        },
        {
            id: 'schedule',
            title: 'League schedule',
            description: 'All events and games for all teams',
            icon: EventIcon,
            csvAction: () => exportLeagueScheduleCSV(leagueId),
            pdfAction: () => exportLeagueSchedulePDF(leagueId),
            fallbackError: 'Failed to export schedule',
            adminOnly: false,
        },
        {
            id: 'attendance',
            title: 'Attendance report',
            description: 'Attendance statistics by division and team',
            icon: AssessmentIcon,
            csvAction: () => exportAttendanceReportCSV(leagueId),
            pdfAction: () => exportAttendanceReportPDF(leagueId),
            fallbackError: 'Failed to export attendance report',
            adminOnly: false,
        },
        {
            id: 'financial',
            title: 'Financial report',
            description: 'Roster size, event volume, ice-time requests, and known accepted venue costs',
            icon: MoneyIcon,
            csvAction: () => exportFinancialReportCSV(leagueId),
            pdfAction: () => exportFinancialReportPDF(leagueId),
            fallbackError: 'Failed to export financial report',
            adminOnly: true,
        },
    ];

    const availableCount = reports.filter((report) => !report.adminOnly || isAdmin).length;

    return (
        <PageContainer>
            <PageHeader
                icon={<DownloadIcon />}
                title="Reports"
                subtitle={`${availableCount} of ${reports.length} exports available · CSV or PDF`}
            />

            <Stack spacing={2}>
                {error && (
                    <Alert severity="error" onClose={() => setError(null)}>
                        {error}
                    </Alert>
                )}

                <Card>
                    <CardHeader
                        title="Exports"
                        subheader="Each report reflects current data at the time of download"
                    />
                    <TableContainer sx={{ border: 0, borderRadius: 0 }}>
                        <Table aria-label="League reports" sx={{ minWidth: 560 }}>
                            <TableHead>
                                <TableRow>
                                    <TableCell>Report</TableCell>
                                    <TableCell>Access</TableCell>
                                    <TableCell align="right">Download</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {reports.map((report) => {
                                    const Icon = report.icon;
                                    const isDisabled = report.adminOnly && !isAdmin;
                                    const isCsvLoading = loading === `${report.id}-csv`;
                                    const isPdfLoading = loading === `${report.id}-pdf`;
                                    const isLoading = isCsvLoading || isPdfLoading;

                                    return (
                                        <TableRow key={report.id} sx={{ opacity: isDisabled ? 0.6 : 1 }}>
                                            <TableCell>
                                                <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.25 }}>
                                                    <Icon
                                                        fontSize="small"
                                                        aria-hidden
                                                        sx={{ color: 'text.secondary', mt: '2px', flexShrink: 0 }}
                                                    />
                                                    <Box sx={{ minWidth: 0 }}>
                                                        <Typography variant="body2" component="h3" sx={{ fontWeight: 600 }}>
                                                            {report.title}
                                                        </Typography>
                                                        <Typography variant="caption" color="text.secondary" display="block">
                                                            {report.description}
                                                        </Typography>
                                                    </Box>
                                                </Box>
                                            </TableCell>
                                            <TableCell sx={{ whiteSpace: 'nowrap' }}>
                                                {report.adminOnly ? (
                                                    <Chip
                                                        size="small"
                                                        variant="outlined"
                                                        label={isDisabled ? 'Admin access required' : 'Admins'}
                                                        color={isDisabled ? 'warning' : 'default'}
                                                    />
                                                ) : (
                                                    <Typography variant="caption" color="text.secondary">
                                                        All members
                                                    </Typography>
                                                )}
                                            </TableCell>
                                            <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                                                <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                                                    <Button
                                                        size="small"
                                                        variant="outlined"
                                                        startIcon={isCsvLoading ? <CircularProgress size={14} color="inherit" /> : <DownloadIcon />}
                                                        onClick={() => handleExport(report.id, 'csv', report.csvAction, report.fallbackError)}
                                                        disabled={isDisabled || isLoading}
                                                        aria-label={`Download ${report.title} as CSV`}
                                                    >
                                                        {isCsvLoading ? 'Exporting…' : 'CSV'}
                                                    </Button>
                                                    <Button
                                                        size="small"
                                                        variant="outlined"
                                                        startIcon={isPdfLoading ? <CircularProgress size={14} color="inherit" /> : <PdfIcon />}
                                                        onClick={() => handleExport(report.id, 'pdf', report.pdfAction, report.fallbackError)}
                                                        disabled={isDisabled || isLoading}
                                                        aria-label={`Download ${report.title} as PDF`}
                                                    >
                                                        {isPdfLoading ? 'Exporting…' : 'PDF'}
                                                    </Button>
                                                </Stack>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </Card>

                <Card>
                    <CardHeader title="About exports" />
                    <CardContent>
                        <Stack spacing={1}>
                            <Typography variant="body2" color="text.secondary">
                                CSV files open in spreadsheet applications like Microsoft Excel, Google Sheets, or Apple Numbers. PDF exports provide a readable snapshot for sharing or archival.
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                All exports include current data as of the download time. For historical tracking, save exports with dated filenames.
                            </Typography>
                        </Stack>
                    </CardContent>
                </Card>
            </Stack>
        </PageContainer>
    );
}
