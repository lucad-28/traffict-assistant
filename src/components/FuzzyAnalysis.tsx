'use client';

import { FuzzyClassification } from '@/types/chat';
import { TrendingUp, Info, AlertTriangle } from 'lucide-react';

interface FuzzyAnalysisProps {
  fuzzyClassification: FuzzyClassification;
  spiPredicted: number;
  status?: string;
}

function getConfidenceLabel(confidenceLevel: string): string {
  const labels: { [key: string]: string } = {
    high: 'Alta',
    medium: 'Media',
    low: 'Baja'
  };
  return labels[confidenceLevel.toLowerCase()] || confidenceLevel;
}

function getConfidenceBadgeClass(confidenceLevel: string): string {
  const classes: { [key: string]: string } = {
    high: 'bg-green-100 text-green-800 border-green-300',
    medium: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    low: 'bg-red-100 text-red-800 border-red-300'
  };
  return classes[confidenceLevel.toLowerCase()] || 'bg-gray-100 text-gray-800 border-gray-300';
}

export function FuzzyAnalysis({ fuzzyClassification, spiPredicted, status }: FuzzyAnalysisProps) {
  if (!fuzzyClassification) {
    return null;
  }

  const confidenceLevel = fuzzyClassification.confidence >= 0.7 ? 'high'
    : fuzzyClassification.confidence >= 0.5 ? 'medium'
    : 'low';

  return (
    <div className="mt-3 space-y-3 border-t border-gray-200 pt-3">
      {/* Section Header */}
      <div className="flex items-center gap-2">
        <TrendingUp className="h-4 w-4 text-blue-600" />
        <h4 className="font-bold text-sm">Análisis Difuso</h4>
      </div>

      {/* SPI Predicted */}
      <div className="bg-gray-50 rounded-md p-2">
        <div className="text-xs text-gray-600">SPI Predicted</div>
        <div className="text-lg font-bold">{spiPredicted.toFixed(3)}</div>
        {status && (
          <div className="text-xs text-gray-600 mt-1">Status: {status}</div>
        )}
      </div>

      {/* Linguistic Description */}
      <div className="bg-blue-50 rounded-md p-2">
        <div className="flex items-start gap-2">
          <Info className="h-4 w-4 text-blue-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-gray-700">
            {fuzzyClassification.linguistic_description}
          </p>
        </div>
      </div>

      {/* Confidence Level */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-gray-700">Confianza:</span>
        <span className={`px-2 py-1 rounded text-xs font-medium border ${getConfidenceBadgeClass(confidenceLevel)}`}>
          {getConfidenceLabel(confidenceLevel)} ({Math.round(fuzzyClassification.confidence * 100)}%)
        </span>
      </div>

      {/* Membership Bar Chart */}
      {fuzzyClassification.ranked_categories && fuzzyClassification.ranked_categories.length > 0 && (
        <div className="space-y-2">
          <h5 className="text-xs font-semibold text-gray-700">Grados de Pertenencia:</h5>
          {fuzzyClassification.ranked_categories.map((category, index) => (
            <div key={index} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-gray-700">{category.label}</span>
                <span className="text-gray-600">{Math.round(category.membership * 100)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-300"
                  style={{
                    width: `${category.membership * 100}%`,
                    backgroundColor: category.color,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Transition State Alert */}
      {fuzzyClassification.is_transition_state && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-md p-2">
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div>
              <span className="font-medium text-yellow-800 text-sm block">
                Estado de Transición Detectado
              </span>
              <p className="text-xs text-yellow-700 mt-1">
                El tráfico presenta características de múltiples estados.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
