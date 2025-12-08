"use client";

import React, { useState, useEffect } from 'react';
import { 
  Container, Paper, Typography, Box, Grid, Card, CardContent, 
  Button, Select, MenuItem, FormControl, InputLabel, Alert,
  Chip, CircularProgress, Table, TableBody, TableCell, 
  TableContainer, TableHead, TableRow,
  Dialog, DialogTitle, DialogContent, DialogActions,
  Stepper, Step, StepLabel, Avatar
} from '@mui/material';
import {
  Download as DownloadIcon,
  Preview as PreviewIcon,
  Schedule as ScheduleIcon,
  Person as PersonIcon,
  Train as TrainIcon,
  AccessTime as AccessTimeIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon
} from '@mui/icons-material';
import { motion } from 'framer-motion';
// import { API_BASE } from '@/lib/config';

const API_BASE =
  process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5005";

// Define types
interface Operator {
  id: string;
  name: string;
  employee_id: string;
  phone: string;
  email: string;
  experience_years: number;
  license_type: string;
  status: string;
}

interface DutySchedule {
  date: string;
  duty_id: string;
  shift: string;
  operator_id: string;
  operator_name: string;
  phone: string;
  employee_id: string;
  sign_on: string;
  sign_off: string;
  total_hours: number;
  driving_hours: number;
  break_hours: number;
  meal_break: string;
  standby_time: string;
  train_id: string;
  train_config: string;
  trips: Array<{
    trip_number: string;
    route: string;
    departure: string;
    arrival: string;
    duration: string;
    pax_estimate: string;
    notes: string;
    predicted_delay_minutes?: number;
    predicted_delay_summary?: string;
  }>;
  restrictions: Array<{
    type: string;
    description: string;
    reason?: string;
    action?: string;
  }>;
  emergency_contacts: Record<string, string>;
  pre_check_checklist: string[];
  reminders: string[];
  generated_at: string;
}

interface DutySummary {
  service_date: string;
  generated_at: string;
  total_operators: number;
  duty_assignments: Array<{
    operator_id: string;
    operator_name: string;
    duty_id: string;
    shift: string;
    train_id: string;
    sign_on: string;
    sign_off: string;
    total_hours: number;
  }>;
  // Optional extended fields from backend for richer views
  master_timetable?: Array<{
    trip_id: string;
    train_id: string;
    origin: string;
    destination: string;
    scheduled_departure_time: string;
    scheduled_arrival_time: string;
    estimated_duration: number;
  }>;
  train_roster?: Record<
    string,
    {
      train_id: string;
      date: string;
      first_trip: string;
      last_trip: string;
      car_configuration: string;
      known_issues: string[];
      depot_location: string;
    }
  >;
}

export default function TrainOperatorsPage() {
  const [operators, setOperators] = useState<Operator[]>([]);
  const [selectedOperator, setSelectedOperator] = useState<string>('');
  const [dutySchedule, setDutySchedule] = useState<DutySchedule | null>(null);
  const [dutySummary, setDutySummary] = useState<DutySummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [activeStep, setActiveStep] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchOperators();
    fetchDutySummary();
  }, []);

  const fetchOperators = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/operators`);
      const data = await response.json();
      if (data.success) {
        setOperators(data.operators);
      } else {
        setError('Failed to load operators');
      }
    } catch (err) {
      console.error('Error fetching operators:', err);
      setError('Failed to load operators');
    }
  };

  const fetchDutySummary = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/operators/summary`);
      const data = await response.json();
      if (data.success) {
        setDutySummary(data.summary);
      }
    } catch (err) {
      console.error('Error fetching duty summary:', err);
    }
  };

  const fetchDutySchedule = async (operatorId: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE}/api/operators/${operatorId}/duty`);
      const data = await response.json();
      
      if (data.success) {
        setDutySchedule(data.duty);
        setActiveStep(1);
      } else {
        setError('Failed to fetch duty schedule');
      }
    } catch (err) {
      console.error('Error fetching duty schedule:', err);
      setError('Failed to fetch duty schedule');
    } finally {
      setLoading(false);
    }
  };

  const generatePDF = async () => {
    if (!selectedOperator) return;
    
    setPdfLoading(true);
    try {
      window.open(`${API_BASE}/api/operators/${selectedOperator}/duty/pdf/download`, '_blank');
    } catch (err) {
      console.error('Error generating PDF:', err);
      setError('Failed to generate PDF');
    } finally {
      setPdfLoading(false);
    }
  };

  const previewPDF = () => {
    if (!selectedOperator) return;
    setPreviewOpen(true);
  };

  const formatTime = (timeStr: string) => {
    try {
      const [hours, minutes] = timeStr.split(':');
      const hour = parseInt(hours);
      const ampm = hour >= 12 ? 'PM' : 'AM';
      const displayHour = hour % 12 || 12;
      return `${displayHour}:${minutes} ${ampm}`;
    } catch {
      return timeStr;
    }
  };

  const getShiftColor = (shift: string) => {
    if (shift.includes('EARLY')) return '#06d6a0';
    if (shift.includes('LATE')) return '#38bdf8';
    return '#718096';
  };

  const steps = ['Select Operator', 'View Schedule', 'Generate PDF'];

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Paper elevation={3} sx={{ 
          p: 4, 
          mb: 4, 
          borderRadius: 2,
          background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
          color: '#f8fafc'
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
            <ScheduleIcon sx={{ fontSize: 40, color: '#38bdf8', mr: 2 }} />
            <Box>
              <Typography variant="h4" component="h1" fontWeight="bold">
                Train Operator Duty Scheduler
              </Typography>
              <Typography variant="subtitle1" sx={{ color: '#cbd5e1' }}>
                Generate and manage duty schedules for KMRL train operators
              </Typography>
            </Box>
          </Box>

          <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
            {steps.map((label) => (
              <Step key={label}>
                <StepLabel sx={{ color: '#f8fafc' }}>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>

          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}

          {/* Master daily operator roster */}
          {dutySummary && (
            <Card
              sx={{
                mb: 4,
                background: 'rgba(15, 23, 42, 0.9)',
                borderRadius: 2,
                border: '1px solid rgba(148, 163, 184, 0.3)',
              }}
            >
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                  <Box>
                    <Typography variant="h6" sx={{ color: '#f8fafc' }}>
                      Daily Operator Roster
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#94a3b8' }}>
                      {new Date(dutySummary.service_date).toLocaleDateString('en-IN', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </Typography>
                  </Box>
                  <Chip
                    label={`${dutySummary.duty_assignments.length} duties`}
                    size="small"
                    sx={{
                      background: 'rgba(56, 189, 248, 0.15)',
                      color: '#38bdf8',
                      fontWeight: 'bold',
                      alignSelf: 'center',
                    }}
                  />
                </Box>

                <TableContainer
                  sx={{
                    maxHeight: 320,
                    borderRadius: 2,
                    border: '1px solid rgba(148, 163, 184, 0.3)',
                    background: 'rgba(15, 23, 42, 0.9)',
                  }}
                >
                  <Table stickyHeader size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ color: '#cbd5e1', backgroundColor: '#020617' }}>
                          Operator
                        </TableCell>
                        <TableCell sx={{ color: '#cbd5e1', backgroundColor: '#020617' }}>
                          Duty ID
                        </TableCell>
                        <TableCell sx={{ color: '#cbd5e1', backgroundColor: '#020617' }}>
                          Shift
                        </TableCell>
                        <TableCell sx={{ color: '#cbd5e1', backgroundColor: '#020617' }}>
                          Train
                        </TableCell>
                        <TableCell sx={{ color: '#cbd5e1', backgroundColor: '#020617' }}>
                          Sign-on
                        </TableCell>
                        <TableCell sx={{ color: '#cbd5e1', backgroundColor: '#020617' }}>
                          Sign-off
                        </TableCell>
                        <TableCell sx={{ color: '#cbd5e1', backgroundColor: '#020617' }}>
                          Hours
                        </TableCell>
                        <TableCell sx={{ color: '#cbd5e1', backgroundColor: '#020617' }}>
                          Status
                        </TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {dutySummary.duty_assignments.map((row) => {
                        const isOff = row.shift.includes('OFF');
                        const isSpare = row.shift.includes('SPARE');
                        const statusLabel = isOff ? 'OFF' : isSpare ? 'SPARE' : 'ON DUTY';
                        const statusColor = isOff
                          ? '#64748b'
                          : isSpare
                          ? '#fbbf24'
                          : '#22c55e';

                        return (
                          <TableRow
                            key={row.duty_id}
                            hover
                            sx={{
                              cursor: 'pointer',
                              '&:hover': {
                                backgroundColor: 'rgba(15, 23, 42, 0.9)',
                              },
                            }}
                            onClick={() => {
                              setSelectedOperator(row.operator_id);
                              fetchDutySchedule(row.operator_id);
                            }}
                          >
                            <TableCell sx={{ color: '#e2e8f0' }}>
                              {row.operator_name}
                            </TableCell>
                            <TableCell sx={{ color: '#e2e8f0' }}>{row.duty_id}</TableCell>
                            <TableCell>
                              <Chip
                                label={row.shift}
                                size="small"
                                sx={{
                                  background: 'rgba(148, 163, 184, 0.15)',
                                  color: getShiftColor(row.shift),
                                  fontWeight: 'bold',
                                }}
                              />
                            </TableCell>
                            <TableCell sx={{ color: '#e2e8f0' }}>
                              {row.train_id || '—'}
                            </TableCell>
                            <TableCell sx={{ color: '#e2e8f0' }}>
                              {row.sign_on ? formatTime(row.sign_on) : '—'}
                            </TableCell>
                            <TableCell sx={{ color: '#e2e8f0' }}>
                              {row.sign_off ? formatTime(row.sign_off) : '—'}
                            </TableCell>
                            <TableCell sx={{ color: '#e2e8f0' }}>
                              {row.total_hours ? `${row.total_hours}h` : '—'}
                            </TableCell>
                            <TableCell>
                              <Chip
                                label={statusLabel}
                                size="small"
                                sx={{
                                  background: 'rgba(15, 23, 42, 0.9)',
                                  border: `1px solid ${statusColor}`,
                                  color: statusColor,
                                  fontWeight: 'bold',
                                }}
                              />
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          )}

          <Grid container spacing={4} component="div">
            {/* Left Column - Selection and Summary */}
            <Grid item xs={12} md={4} component="div">
              <Card sx={{ 
                height: '100%',
                background: 'rgba(15, 23, 42, 0.8)',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(148, 163, 184, 0.2)',
                borderRadius: 2
              }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom sx={{ color: '#f8fafc' }}>
                    <PersonIcon sx={{ mr: 1, verticalAlign: 'middle', color: '#38bdf8' }} />
                    Operator Selection
                  </Typography>
                  
                  <FormControl fullWidth sx={{ mb: 3 }}>
                    <InputLabel sx={{ color: '#94a3b8' }}>Select Operator</InputLabel>
                    <Select
                      value={selectedOperator}
                      label="Select Operator"
                      onChange={(e) => setSelectedOperator(e.target.value)}
                      disabled={loading}
                      sx={{
                        color: '#f8fafc',
                        '& .MuiOutlinedInput-notchedOutline': {
                          borderColor: 'rgba(148, 163, 184, 0.3)',
                        },
                        '&:hover .MuiOutlinedInput-notchedOutline': {
                          borderColor: 'rgba(148, 163, 184, 0.5)',
                        }
                      }}
                    >
                      <MenuItem value="">
                        <em style={{ color: '#94a3b8' }}>Select an operator</em>
                      </MenuItem>
                      {operators.map((operator) => (
                        <MenuItem key={operator.id} value={operator.id}>
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <Avatar sx={{ 
                              width: 36, 
                              height: 36, 
                              mr: 2, 
                              background: `linear-gradient(135deg, #38bdf8 0%, #06d6a0 100%)`,
                              color: '#0f172a',
                              fontWeight: 'bold'
                            }}>
                              {operator.name.charAt(0)}
                            </Avatar>
                            <Box>
                              <Typography variant="body1" sx={{ color: '#f8fafc' }}>
                                {operator.name}
                              </Typography>
                              <Typography variant="caption" sx={{ color: '#94a3b8' }}>
                                {operator.employee_id}
                              </Typography>
                            </Box>
                          </Box>
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>

                  <Button
                    variant="contained"
                    fullWidth
                    size="large"
                    onClick={() => fetchDutySchedule(selectedOperator)}
                    disabled={!selectedOperator || loading}
                    sx={{
                      background: 'linear-gradient(135deg, #38bdf8 0%, #06d6a0 100%)',
                      mb: 2,
                      py: 1.5,
                      borderRadius: 2,
                      fontWeight: 'bold',
                      '&:hover': {
                        background: 'linear-gradient(135deg, #06d6a0 0%, #38bdf8 100%)',
                        transform: 'translateY(-2px)'
                      }
                    }}
                  >
                    {loading ? <CircularProgress size={24} /> : 'Generate Duty Schedule'}
                  </Button>

                  {dutySummary && (
                    <Box sx={{ mt: 3 }}>
                      <Typography variant="h6" gutterBottom sx={{ color: '#f8fafc' }}>
                        Daily Summary
                      </Typography>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                        <Typography variant="body2" sx={{ color: '#94a3b8' }}>Total Operators:</Typography>
                        <Chip 
                          label={dutySummary.total_operators} 
                          size="small" 
                          sx={{ 
                            background: 'rgba(56, 189, 248, 0.2)',
                            color: '#38bdf8'
                          }}
                        />
                      </Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                        <Typography variant="body2" sx={{ color: '#94a3b8' }}>Active Today:</Typography>
                        <Typography variant="body2" sx={{ color: '#06d6a0' }}>
                          {dutySummary.duty_assignments?.length || 0}
                        </Typography>
                      </Box>
                    </Box>
                  )}

                  {dutySchedule && (
                    <Box sx={{ mt: 3 }}>
                      <Typography variant="h6" gutterBottom sx={{ color: '#f8fafc' }}>
                        Export Options
                      </Typography>
                      <Grid container spacing={1} component="div">
                        <Grid item xs={6} component="div">
                          <Button
                            variant="outlined"
                            fullWidth
                            onClick={generatePDF}
                            disabled={pdfLoading}
                            startIcon={pdfLoading ? <CircularProgress size={20} /> : <DownloadIcon />}
                            sx={{
                              borderColor: 'rgba(148, 163, 184, 0.3)',
                              color: '#f8fafc',
                              '&:hover': {
                                borderColor: '#38bdf8',
                                background: 'rgba(56, 189, 248, 0.1)'
                              }
                            }}
                          >
                            PDF
                          </Button>
                        </Grid>
                        <Grid item xs={6} component="div">
                          <Button
                            variant="outlined"
                            fullWidth
                            onClick={previewPDF}
                            startIcon={<PreviewIcon />}
                            sx={{
                              borderColor: 'rgba(148, 163, 184, 0.3)',
                              color: '#f8fafc',
                              '&:hover': {
                                borderColor: '#fbbf24',
                                background: 'rgba(251, 191, 36, 0.1)'
                              }
                            }}
                          >
                            Preview
                          </Button>
                        </Grid>
                      </Grid>
                    </Box>
                  )}
                </CardContent>
              </Card>
            </Grid>

            {/* Right Column - Duty Schedule */}
            <Grid item xs={12} md={8} component="div">
              {dutySchedule ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.5 }}
                >
                  <Card sx={{ 
                    background: 'rgba(15, 23, 42, 0.8)',
                    backdropFilter: 'blur(10px)',
                    border: '1px solid rgba(148, 163, 184, 0.2)',
                    borderRadius: 2
                  }}>
                    <CardContent>
                      {/* Header */}
                      <Box sx={{ 
                        background: 'linear-gradient(135deg, #003366 0%, #0066cc 100%)', 
                        color: 'white', 
                        p: 3, 
                        borderRadius: 1,
                        textAlign: 'center',
                        mb: 3
                      }}>
                        <Typography variant="h5" gutterBottom>
                          KOCHI METRO RAIL LIMITED (KMRL)
                        </Typography>
                        <Typography variant="subtitle1">
                          TRAIN OPERATOR DUTY SCHEDULE
                        </Typography>
                      </Box>

                      {/* Operator Info */}
                      <Grid container spacing={2} sx={{ mb: 3 }} component="div">
                        <Grid item xs={12} sm={4} component="div">
                          <Paper sx={{ 
                            p: 2, 
                            background: 'rgba(30, 41, 59, 0.6)',
                            border: '1px solid rgba(148, 163, 184, 0.2)',
                            borderRadius: 2
                          }}>
                            <Typography variant="caption" sx={{ color: '#94a3b8', display: 'block' }}>
                              DATE
                            </Typography>
                            <Typography variant="body1" sx={{ color: '#f8fafc' }}>
                              {new Date(dutySchedule.date).toLocaleDateString('en-IN', {
                                weekday: 'long',
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric'
                              })}
                            </Typography>
                          </Paper>
                        </Grid>
                        <Grid item xs={12} sm={4} component="div">
                          <Paper sx={{ 
                            p: 2, 
                            background: 'rgba(30, 41, 59, 0.6)',
                            border: '1px solid rgba(148, 163, 184, 0.2)',
                            borderRadius: 2
                          }}>
                            <Typography variant="caption" sx={{ color: '#94a3b8', display: 'block' }}>
                              DUTY ID
                            </Typography>
                            <Typography variant="body1" sx={{ color: '#f8fafc' }}>
                              {dutySchedule.duty_id}
                            </Typography>
                          </Paper>
                        </Grid>
                        <Grid item xs={12} sm={4} component="div">
                          <Paper sx={{ 
                            p: 2, 
                            background: 'rgba(30, 41, 59, 0.6)',
                            border: `1px solid ${getShiftColor(dutySchedule.shift)}`,
                            borderRadius: 2
                          }}>
                            <Typography variant="caption" sx={{ color: '#94a3b8', display: 'block' }}>
                              SHIFT
                            </Typography>
                            <Typography variant="body1" sx={{ color: getShiftColor(dutySchedule.shift), fontWeight: 'bold' }}>
                              {dutySchedule.shift}
                            </Typography>
                          </Paper>
                        </Grid>
                      </Grid>

                      {/* Operator Details */}
                      <Paper sx={{ 
                        p: 2, 
                        mb: 3, 
                        background: 'rgba(30, 41, 59, 0.6)',
                        border: '1px solid rgba(148, 163, 184, 0.2)',
                        borderRadius: 2
                      }}>
                        <Grid container spacing={2} alignItems="center" component="div">
                          <Grid item xs={12} md={6} component="div">
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                              <Avatar sx={{ 
                                width: 48, 
                                height: 48, 
                                mr: 2,
                                background: `linear-gradient(135deg, ${getShiftColor(dutySchedule.shift)} 0%, #38bdf8 100%)`,
                                color: '#0f172a',
                                fontSize: '1.25rem',
                                fontWeight: 'bold'
                              }}>
                                {dutySchedule.operator_name.charAt(0)}
                              </Avatar>
                              <Box>
                                <Typography variant="h6" sx={{ color: '#f8fafc' }}>
                                  {dutySchedule.operator_name}
                                </Typography>
                                <Typography variant="caption" sx={{ color: '#94a3b8' }}>
                                  {dutySchedule.employee_id}
                                </Typography>
                              </Box>
                            </Box>
                          </Grid>
                          <Grid item xs={12} md={6} component="div">
                            <Typography variant="body1" sx={{ color: '#f8fafc' }}>
                              <strong>Phone:</strong> {dutySchedule.phone}
                            </Typography>
                          </Grid>
                        </Grid>
                      </Paper>

                      {/* Duty Summary */}
                      <Paper sx={{ 
                        p: 2, 
                        mb: 3, 
                        background: 'rgba(56, 189, 248, 0.1)',
                        border: '1px solid rgba(56, 189, 248, 0.3)',
                        borderRadius: 2
                      }}>
                        <Typography variant="h6" sx={{ color: '#38bdf8', mb: 2 }}>
                          Duty Summary
                        </Typography>
                        
                        <Grid container spacing={2} component="div">
                          {[
                            { label: 'Sign-on', value: formatTime(dutySchedule.sign_on), color: '#06d6a0' },
                            { label: 'Sign-off', value: formatTime(dutySchedule.sign_off), color: '#fbbf24' },
                            { label: 'Total Duty', value: `${dutySchedule.total_hours}h`, color: '#38bdf8' },
                            { label: 'Driving', value: `${dutySchedule.driving_hours}h`, color: '#06d6a0' }
                          ].map((item, index) => (
                            <Grid item xs={6} sm={3} key={index} component="div">
                              <Box sx={{ textAlign: 'center' }}>
                                <Typography variant="caption" sx={{ color: '#94a3b8', display: 'block' }}>
                                  {item.label}
                                </Typography>
                                <Typography variant="body1" sx={{ color: item.color, fontWeight: 'medium' }}>
                                  {item.value}
                                </Typography>
                              </Box>
                            </Grid>
                          ))}
                        </Grid>
                      </Paper>

                      {/* Train Assignment */}
                      <Paper sx={{ 
                        p: 2, 
                        mb: 3, 
                        background: 'rgba(251, 191, 36, 0.1)',
                        border: '1px solid rgba(251, 191, 36, 0.3)',
                        borderRadius: 2
                      }}>
                        <Typography variant="h6" sx={{ color: '#fbbf24', mb: 2 }}>
                          Train Assignment
                        </Typography>
                        
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                          <Chip 
                            label={dutySchedule.train_id}
                            sx={{ 
                              background: 'rgba(251, 191, 36, 0.2)',
                              color: '#fbbf24',
                              fontWeight: 'bold',
                              mr: 2
                            }}
                          />
                          <Typography variant="body1" sx={{ color: '#f8fafc' }}>
                            {typeof dutySchedule.train_config === 'string'
                              ? dutySchedule.train_config
                              : (dutySchedule.train_config as any).config_string}
                          </Typography>
                          {typeof dutySchedule.train_config !== 'string' &&
                            (dutySchedule.train_config as any).known_issues &&
                            (dutySchedule.train_config as any).known_issues.length > 0 && (
                              <Box sx={{ mt: 1 }}>
                                {(dutySchedule.train_config as any).known_issues.map((issue: string, i: number) => (
                                  <Chip
                                    key={i}
                                    label={issue}
                                    size="small"
                                    sx={{
                                      mr: 0.5,
                                      mb: 0.5,
                                      background: 'rgba(245, 158, 11, 0.2)',
                                      color: '#fbbf24',
                                      border: '1px solid rgba(245, 158, 11, 0.3)',
                                    }}
                                  />
                                ))}
                              </Box>
                            )}
                        </Box>
                      </Paper>

                      {/* Trip Schedule */}
                      {dutySchedule.trips && Array.isArray(dutySchedule.trips) && dutySchedule.trips.length > 0 && (
                        <Paper
                          sx={{
                            p: 2,
                            mb: 3,
                            background: 'rgba(15, 23, 42, 0.9)',
                            border: '1px solid rgba(148, 163, 184, 0.2)',
                            borderRadius: 2,
                          }}
                        >
                          <Typography variant="h6" sx={{ color: '#e2e8f0', mb: 2 }}>
                            Trip Schedule
                          </Typography>
                          <TableContainer
                            sx={{
                              maxHeight: 260,
                              borderRadius: 1,
                              border: '1px solid rgba(148, 163, 184, 0.3)',
                              background: 'rgba(15, 23, 42, 0.9)',
                            }}
                          >
                            <Table size="small" stickyHeader>
                              <TableHead>
                                <TableRow>
                                  <TableCell sx={{ color: '#cbd5e1', backgroundColor: '#020617' }}>
                                    #
                                  </TableCell>
                                  <TableCell sx={{ color: '#cbd5e1', backgroundColor: '#020617' }}>
                                    Route
                                  </TableCell>
                                  <TableCell sx={{ color: '#cbd5e1', backgroundColor: '#020617' }}>
                                    Depart
                                  </TableCell>
                                  <TableCell sx={{ color: '#cbd5e1', backgroundColor: '#020617' }}>
                                    Arrive
                                  </TableCell>
                                  <TableCell sx={{ color: '#cbd5e1', backgroundColor: '#020617' }}>
                                    Dur.
                                  </TableCell>
                                  <TableCell sx={{ color: '#cbd5e1', backgroundColor: '#020617' }}>
                                    Pax
                                  </TableCell>
                                  <TableCell sx={{ color: '#cbd5e1', backgroundColor: '#020617' }}>
                                    Notes
                                  </TableCell>
                                </TableRow>
                              </TableHead>
                              <TableBody>
                                {dutySchedule.trips.map((trip, idx) => {
                                  // Safely access trip properties with fallbacks
                                  const tripNumber = trip?.trip_number || `T${idx + 1}`;
                                  const route = trip?.route || '—';
                                  const departure = trip?.departure || '—';
                                  const arrival = trip?.arrival || '—';
                                  const duration = trip?.duration || '—';
                                  const paxEstimate = trip?.pax_estimate || '—';
                                  const notes = trip?.notes || '—';
                                  
                                  // Check for delays safely
                                  const predictedDelay = trip?.predicted_delay_minutes;
                                  const delaySummary = trip?.predicted_delay_summary;
                                  const hasDelay = typeof predictedDelay === 'number' && predictedDelay >= 5;
                                  
                                  let displayNotes = notes;
                                  if (hasDelay && delaySummary) {
                                    displayNotes = `${delaySummary} (${predictedDelay} min delay)`;
                                  }

                                  return (
                                    <TableRow key={idx}>
                                      <TableCell sx={{ color: '#e2e8f0' }}>
                                        {tripNumber}
                                      </TableCell>
                                      <TableCell sx={{ color: '#e2e8f0' }}>
                                        {route}
                                      </TableCell>
                                      <TableCell sx={{ color: '#e2e8f0' }}>
                                        {departure}
                                      </TableCell>
                                      <TableCell sx={{ color: '#e2e8f0' }}>
                                        {arrival}
                                      </TableCell>
                                      <TableCell sx={{ color: '#e2e8f0' }}>
                                        {duration}
                                      </TableCell>
                                      <TableCell sx={{ color: '#e2e8f0' }}>
                                        {paxEstimate}
                                      </TableCell>
                                      <TableCell sx={{ color: hasDelay ? '#f97316' : '#e2e8f0' }}>
                                        {displayNotes || '—'}
                                      </TableCell>
                                    </TableRow>
                                  );
                                })}
                              </TableBody>
                            </Table>
                          </TableContainer>
                        </Paper>
                      )}

                      {/* Footer */}
                      <Box sx={{ 
                        mt: 3, 
                        pt: 2, 
                        borderTop: '1px solid rgba(148, 163, 184, 0.2)',
                        textAlign: 'center'
                      }}>
                        <Typography variant="caption" sx={{ color: '#94a3b8' }}>
                          Generated: KMRL Crew System v2.3 | {new Date(dutySchedule.generated_at).toLocaleString()}
                        </Typography>
                      </Box>
                    </CardContent>
                  </Card>
                </motion.div>
              ) : (
                <Card sx={{ 
                  height: '100%', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  p: 8,
                  background: 'rgba(15, 23, 42, 0.8)',
                  backdropFilter: 'blur(10px)',
                  border: '1px solid rgba(148, 163, 184, 0.2)',
                  borderRadius: 2
                }}>
                  <Box textAlign="center">
                    <ScheduleIcon sx={{ fontSize: 60, color: 'rgba(148, 163, 184, 0.3)', mb: 2 }} />
                    <Typography variant="h6" sx={{ color: '#94a3b8', mb: 2 }}>
                      No Duty Schedule Selected
                    </Typography>
                    <Typography variant="body2" sx={{ color: '#64748b' }}>
                      Select an operator and generate a duty schedule to view details here
                    </Typography>
                  </Box>
                </Card>
              )}
            </Grid>
          </Grid>
        </Paper>

        {/* PDF Preview Dialog */}
        <Dialog 
          open={previewOpen} 
          onClose={() => setPreviewOpen(false)}
          maxWidth="lg"
          fullWidth
        >
          <DialogTitle>
            PDF Preview - {dutySchedule?.operator_name}'s Duty Schedule
          </DialogTitle>
          <DialogContent dividers>
            {dutySchedule && (
              <iframe
                src={`${API_BASE}/api/operators/${selectedOperator}/duty/pdf/download`}
                width="100%"
                height="600"
                style={{ border: 'none' }}
                title="PDF Preview"
              />
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setPreviewOpen(false)}>Close</Button>
            <Button 
              variant="contained" 
              onClick={generatePDF}
              startIcon={<DownloadIcon />}
            >
              Download PDF
            </Button>
          </DialogActions>
        </Dialog>
      </motion.div>
    </Container>
  );
}

