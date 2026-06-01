/**
 * Real-time fit preview calculation — Web Worker.
 * Simpler variant of layout.worker.ts, used for live preview updates
 * when the designer adjusts config values.
 */

import type { PanelConfig, PipelinePhase } from '../types';
import {
  getBreakpointFont,
  sumRowWidthMm,
} from '../utils/mathUtils';

export interface FitCheckInput {
  panelConfig: PanelConfig;
  boxW: number;
  boxH: number;
  texts: string[];
  pipeline: PipelinePhase[];
}

export interface FitCheckResult {
  fits: boolean;
  font: number;
  gapMm: number;
  phaseReached: number;
}

export function runFitCheck(input: FitCheckInput): FitCheckResult {
  const { panelConfig, boxW, boxH, texts, pipeline } = input;

  const panelW = panelConfig.face === 'left' || panelConfig.face === 'right' ? boxH : boxW;
  const faceDim = panelConfig.face === 'left' || panelConfig.face === 'right' ? boxH : boxW;
  const safeW = panelW - panelConfig.paddingLeft - panelConfig.paddingRight;

  let font = getBreakpointFont(faceDim, panelConfig.widthBreakpoints) ?? panelConfig.maxFontSizePt;
  let gap = panelConfig.maxGapMm;

  for (let pi = 0; pi < pipeline.length; pi++) {
    const phase = pipeline[pi];
    if (!phase.enabled) continue;

    switch (phase.type) {
      case 'max_font_max_gap': {
        font = getBreakpointFont(faceDim, panelConfig.widthBreakpoints) ?? panelConfig.maxFontSizePt;
        gap = panelConfig.maxGapMm;
        if (fitsInRow(texts, font, gap, safeW)) {
          return { fits: true, font, gapMm: gap, phaseReached: pi };
        }
        break;
      }
      case 'shrink_gaps': {
        gap = panelConfig.minGapMm;
        if (fitsInRow(texts, font, gap, safeW)) {
          return { fits: true, font, gapMm: gap, phaseReached: pi };
        }
        break;
      }
      case 'shrink_font': {
        const pct = (phase.params.shrinkPercent ?? 90) / 100;
        for (let f = font * pct; f >= panelConfig.minFontSizePt; f -= 0.5) {
          if (fitsInRow(texts, f, gap, safeW)) {
            return { fits: true, font: f, gapMm: gap, phaseReached: pi };
          }
        }
        font = panelConfig.minFontSizePt;
        break;
      }
      case 'row_break': {
        font = getBreakpointFont(faceDim, panelConfig.widthBreakpoints) ?? panelConfig.maxFontSizePt;
        gap = panelConfig.maxGapMm;
        return { fits: false, font, gapMm: gap, phaseReached: pi };
      }
      default: {
        return {
          fits: false,
          font: panelConfig.minFontSizePt,
          gapMm: panelConfig.minGapMm,
          phaseReached: pi,
        };
      }
    }
  }

  return {
    fits: false,
    font: panelConfig.minFontSizePt,
    gapMm: panelConfig.minGapMm,
    phaseReached: pipeline.length,
  };
}

function fitsInRow(texts: string[], fontSizePt: number, gapMm: number, safeW: number): boolean {
  return sumRowWidthMm(texts, fontSizePt, gapMm) <= safeW;
}
