'use client';

import React, { useEffect, useState } from 'react';
import { sloReporter } from '@/lib/slo';
import type { SLOReport } from '@/lib/slo';

export function SLODashboard() {
  const [report, setReport] = useState<SLOReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [alerts, setAlerts] = useState<string[]>([]);

  useEffect(() => {
    const loadReport = () => {
      try {
        const sloReport = sloReporter.generateReport();
        setReport(sloReport);
        const sloAlerts = sloReporter.checkAlerts(sloReport);
        setAlerts(sloAlerts);
      } catch (error) {
        console.error('Error loading SLO report:', error);
      } finally {
        setLoading(false);
      }
    };

    loadReport();
    const interval = setInterval(loadReport, 60000); // Refresh every minute

    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return <div className="p-6">Loading SLO data...</div>;
  }

  if (!report) {
    return <div className="p-6">No SLO data available</div>;
  }

  const getStatusColor = (status: 'healthy' | 'warning' | 'critical') => {
    switch (status) {
      case 'healthy':
        return 'text-green-600';
      case 'warning':
        return 'text-yellow-600';
      case 'critical':
        return 'text-red-600';
    }
  };

  const getStatusBgColor = (status: 'healthy' | 'warning' | 'critical') => {
    switch (status) {
      case 'healthy':
        return 'bg-green-50 border-green-200';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200';
      case 'critical':
        return 'bg-red-50 border-red-200';
    }
  };

  const getTrendIcon = (trend: 'improving' | 'degrading' | 'stable') => {
    switch (trend) {
      case 'improving':
        return '↑';
      case 'degrading':
        return '↓';
      case 'stable':
        return '→';
    }
  };

  const formatPercent = (val: number) => `${(val * 100).toFixed(2)}%`;
  const formatMs = (val: number) => `${val.toFixed(0)}ms`;

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">SLO Dashboard</h1>
        <div className="flex items-center gap-2">
          <span className={`text-lg font-semibold ${getStatusColor(report.overallStatus)}`}>
            {report.overallStatus.toUpperCase()}
          </span>
        </div>
      </div>

      {alerts.length > 0 && (
        <div className="space-y-2">
          {alerts.map((alert, index) => (
            <div key={index} className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-lg">
              <div className="font-medium">{alert}</div>
            </div>
          ))}
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-3">
        <div className={`border rounded-lg p-6 ${getStatusBgColor(report.errorRate.status)}`}>
          <h2 className="text-xl font-semibold mb-4">Error Rate</h2>
          <div className="space-y-4">
            <div>
              <div className="text-sm text-gray-600">Current</div>
              <div className={`text-2xl font-bold ${getStatusColor(report.errorRate.status)}`}>
                {formatPercent(report.errorRate.current)}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-600">Target</div>
              <div className="text-lg">{formatPercent(report.errorRate.target)}</div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">Trend:</span>
              <span className="font-medium">{getTrendIcon(report.errorRate.trend)} {report.errorRate.trend}</span>
            </div>
          </div>
        </div>

        <div className={`border rounded-lg p-6 ${getStatusBgColor(report.p95LoadTime.status)}`}>
          <h2 className="text-xl font-semibold mb-4">p95 Load Time</h2>
          <div className="space-y-4">
            <div>
              <div className="text-sm text-gray-600">Current</div>
              <div className={`text-2xl font-bold ${getStatusColor(report.p95LoadTime.status)}`}>
                {formatMs(report.p95LoadTime.current)}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-600">Target</div>
              <div className="text-lg">{formatMs(report.p95LoadTime.target)}</div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">Trend:</span>
              <span className="font-medium">{getTrendIcon(report.p95LoadTime.trend)} {report.p95LoadTime.trend}</span>
            </div>
          </div>
        </div>

        <div className={`border rounded-lg p-6 ${getStatusBgColor(report.testFlakeRate.status)}`}>
          <h2 className="text-xl font-semibold mb-4">Test Flake Rate</h2>
          <div className="space-y-4">
            <div>
              <div className="text-sm text-gray-600">Current</div>
              <div className={`text-2xl font-bold ${getStatusColor(report.testFlakeRate.status)}`}>
                {formatPercent(report.testFlakeRate.current)}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-600">Target</div>
              <div className="text-lg">{formatPercent(report.testFlakeRate.target)}</div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">Trend:</span>
              <span className="font-medium">{getTrendIcon(report.testFlakeRate.trend)} {report.testFlakeRate.trend}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="border rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4">Report Details</h2>
        <pre className="text-sm bg-gray-50 p-4 rounded-lg overflow-auto">
          {sloReporter.formatReportForDisplay(report)}
        </pre>
      </div>

      <div className="text-sm text-gray-600">
        Last updated: {new Date(report.timestamp).toLocaleString()}
      </div>
    </div>
  );
}
