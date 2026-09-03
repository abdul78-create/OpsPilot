'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { DeveloperShell } from '@/components/layout/DeveloperShell';
import {
  listProjects, listPipelines, listAllRuns, listDeployments,
  fetchAiStatus, listAiReports,
  Project, PipelineDefinition, PipelineRun, Deployment,
  AiStatusResponse, AiAnalysisReport
} from '@/lib/apiClient';

// Modular Components
import { AiWorkspaceHeader } from './components/AiWorkspaceHeader';
import { WorkspaceModeSelector, WorkspaceMode } from './components/WorkspaceModeSelector';
import { ContextSelectorBar } from './components/ContextSelectorBar';
import { PipelineGeniusMode } from './components/PipelineGeniusMode';
import { ObservabilitySageMode } from './components/ObservabilitySageMode';
import { DeploymentAdvisorMode } from './components/DeploymentAdvisorMode';
import { SecuritySentinelMode } from './components/SecuritySentinelMode';
import { ContextualAskAi } from './components/ContextualAskAi';
import { AiReportsHistory } from './components/AiReportsHistory';

export default function AiWorkspacePage() {
  // State: Workspace Mode
  const [mode, setMode] = useState<WorkspaceMode>('pipeline');
  const [loading, setLoading] = useState(true);

  // Operational Context from backend
  const [aiStatus, setAiStatus] = useState<AiStatusResponse | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');

  const [pipelines, setPipelines] = useState<PipelineDefinition[]>([]);
  const [selectedPipelineId, setSelectedPipelineId] = useState<string>('');

  const [runs, setRuns] = useState<PipelineRun[]>([]);
  const [selectedRunId, setSelectedRunId] = useState<string>('');

  const [deployments, setDeployments] = useState<Deployment[]>([]);
  const [selectedDeploymentId, setSelectedDeploymentId] = useState<string>('');

  const [reports, setReports] = useState<AiAnalysisReport[]>([]);
  const [selectedReport, setSelectedReport] = useState<AiAnalysisReport | null>(null);

  // 1. Initial Load: Projects, AI Status, Deployments, Reports
  const loadInitialData = useCallback(async () => {
    setLoading(true);
    try {
      const [projsRes, statusRes, depsRes, reportsRes] = await Promise.all([
        listProjects().catch(() => ({ data: [] })),
        fetchAiStatus().catch(() => null),
        listDeployments().catch(() => ({ data: [] })),
        listAiReports().catch(() => ({ data: [] })),
      ]);

      const projs = projsRes.data ?? [];
      setProjects(projs);
      if (projs.length > 0 && !selectedProjectId) {
        setSelectedProjectId(projs[0].id);
      }

      if (statusRes?.data) {
        setAiStatus(statusRes.data);
      }

      const deps = depsRes.data ?? [];
      setDeployments(deps);
      if (deps.length > 0 && !selectedDeploymentId) {
        setSelectedDeploymentId(deps[0].id);
      }

      setReports(reportsRes.data ?? []);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, [selectedProjectId, selectedDeploymentId]);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  // 2. Project-dependent Load: Pipelines & Runs
  useEffect(() => {
    if (!selectedProjectId) {
      setPipelines([]);
      setRuns([]);
      return;
    }

    let isMounted = true;
    Promise.all([
      listPipelines(selectedProjectId).catch(() => ({ data: [] })),
      listAllRuns(selectedProjectId).catch(() => []),
    ]).then(([pipesRes, runsRes]) => {
      if (!isMounted) return;
      const pipes = pipesRes.data ?? [];
      setPipelines(pipes);
      if (pipes.length > 0) {
        setSelectedPipelineId(pipes[0].id);
      } else {
        setSelectedPipelineId('');
      }

      const runList = Array.isArray(runsRes) ? runsRes : [];
      setRuns(runList);
      if (runList.length > 0) {
        setSelectedRunId(runList[0].id);
      } else {
        setSelectedRunId('');
      }
    });

    return () => {
      isMounted = false;
    };
  }, [selectedProjectId]);

  // Active Context Objects
  const activePipeline = pipelines.find((p) => p.id === selectedPipelineId) || pipelines[0] || null;
  const activeRun = runs.find((r) => r.id === selectedRunId) || runs[0] || null;
  const activeDeployment = deployments.find((d) => d.id === selectedDeploymentId) || deployments[0] || null;

  const handleReportGenerated = (newReport: AiAnalysisReport) => {
    setReports((prev) => [newReport, ...prev]);
  };

  return (
    <DeveloperShell>
      <div className="space-y-6 max-w-7xl mx-auto pb-12">
        {/* ── 1. Page Header ── */}
        <AiWorkspaceHeader
          aiStatus={aiStatus}
          loading={loading}
          onRefresh={loadInitialData}
        />

        {/* ── 2. Specialized Workspace Selector Cards ── */}
        <WorkspaceModeSelector
          selectedMode={mode}
          onSelectMode={setMode}
        />

        {/* ── 3. Operational Context Selector Bar ── */}
        <ContextSelectorBar
          projects={projects}
          selectedProjectId={selectedProjectId}
          onSelectProject={setSelectedProjectId}

          pipelines={pipelines}
          selectedPipelineId={selectedPipelineId}
          onSelectPipeline={setSelectedPipelineId}

          runs={runs}
          selectedRunId={selectedRunId}
          onSelectRun={setSelectedRunId}

          deployments={deployments}
          selectedDeploymentId={selectedDeploymentId}
          onSelectDeployment={setSelectedDeploymentId}

          mode={mode}
        />

        {/* ── 4. Specialized Active Workspace View ── */}
        {mode === 'pipeline' && (
          <PipelineGeniusMode
            pipeline={activePipeline}
            runs={runs}
            onReportGenerated={handleReportGenerated}
          />
        )}

        {mode === 'observability' && (
          <ObservabilitySageMode
            run={activeRun}
            onReportGenerated={handleReportGenerated}
          />
        )}

        {mode === 'deployment' && (
          <DeploymentAdvisorMode
            deployment={activeDeployment}
            onReportGenerated={handleReportGenerated}
          />
        )}

        {mode === 'security' && (
          <SecuritySentinelMode
            pipeline={activePipeline}
            run={activeRun}
            onReportGenerated={handleReportGenerated}
          />
        )}

        {/* ── 5. Universal Contextual Ask AI Panel ── */}
        <ContextualAskAi
          workspace={mode}
          projectId={selectedProjectId}
          pipelineId={activePipeline?.id}
          runId={activeRun?.id}
          deploymentId={activeDeployment?.id}
        />

        {/* ── 6. Verified AI Analysis Reports History ── */}
        <AiReportsHistory
          reports={reports}
          onSelectReport={(rep) => setSelectedReport(rep)}
        />
      </div>
    </DeveloperShell>
  );
}
