import { useCallback, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { PURCHASE_CHECKLIST_ITEMS } from "@/lib/constants/checklist";

function keyFor(analysisId: string) {
  return `bilkoll.checklist.${analysisId}.v1`;
}

export function useChecklist(analysisId: string) {
  const [checked, setChecked] = useState<Record<number, boolean>>({});

  useEffect(() => {
    AsyncStorage.getItem(keyFor(analysisId)).then((raw) => {
      if (raw) setChecked(JSON.parse(raw));
    });
  }, [analysisId]);

  const toggle = useCallback(
    (index: number) => {
      setChecked((prev) => {
        const next = { ...prev, [index]: !prev[index] };
        AsyncStorage.setItem(keyFor(analysisId), JSON.stringify(next));
        return next;
      });
    },
    [analysisId]
  );

  const completedCount = Object.values(checked).filter(Boolean).length;

  return { items: PURCHASE_CHECKLIST_ITEMS, checked, toggle, completedCount, total: PURCHASE_CHECKLIST_ITEMS.length };
}
