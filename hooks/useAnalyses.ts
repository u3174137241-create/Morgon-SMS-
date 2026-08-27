import { useCallback, useEffect, useState } from "react";
import type { AnalysisResult } from "@/types/analysis";
import { listAnalyses } from "@/services/analysisService";

export function useAnalyses() {
  const [analyses, setAnalyses] = useState<AnalysisResult[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const data = await listAnalyses();
      setAnalyses(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  return { analyses, loading, reload };
}
