import { useQuery } from "@tanstack/react-query";
import { AcademicPeriodTypeEnum } from "@shared/schema";

interface PeriodBoundary {
  periodKey: string;
  periodName: string;
  startDate: string;
  endDate: string;
  academicYear: string;
}

interface AcademicPeriodsData {
  periodType: AcademicPeriodTypeEnum;
  boundaries: PeriodBoundary[];
}

/**
 * Хук для получения настроек учебных периодов класса
 */
export function useAcademicPeriods(classId: number | null) {
  return useQuery({
    queryKey: [`/api/academic-periods/${classId}`],
    enabled: !!classId,
    select: (data): AcademicPeriodsData => data,
    staleTime: 0,
    retry: 2,
    retryDelay: 1000,
    onError: (error: any) => {
      console.error("Ошибка загрузки настроек учебных периодов:", error);
      // Не показываем toast, так как есть fallback значения
    }
  });
}

/**
 * Получает даты периода из настроек класса или использует значения по умолчанию
 */
export function getPeriodDatesFromSettings(
  periodKey: string,
  academicPeriodsData: AcademicPeriodsData | undefined,
  currentYear: number
): {
  startDate: Date;
  endDate: Date;
  label: string;
} {
  // Если есть настройки для класса, используем их
  if (academicPeriodsData?.boundaries) {
    const boundary = academicPeriodsData.boundaries.find(b => b.periodKey === periodKey);
    if (boundary) {
      return {
        startDate: new Date(boundary.startDate),
        endDate: new Date(boundary.endDate),
        label: boundary.periodName
      };
    }
  }

  // Иначе используем значения по умолчанию
  return getDefaultPeriodDates(periodKey, currentYear);
}

/**
 * Получает значения по умолчанию для периодов (fallback)
 */
function getDefaultPeriodDates(periodKey: string, currentYear: number): {
  startDate: Date;
  endDate: Date;
  label: string;
} {
  const academicYear = currentYear >= 9 ? currentYear : currentYear - 1;

  switch (periodKey) {
    case 'quarter1':
      return {
        startDate: new Date(academicYear, 8, 1), // 1 сентября
        endDate: new Date(academicYear, 9, 31), // 31 октября
        label: `1 четверть`
      };
    case 'quarter2':
      return {
        startDate: new Date(academicYear, 10, 1), // 1 ноября
        endDate: new Date(academicYear, 11, 31), // 31 декабря
        label: `2 четверть`
      };
    case 'quarter3':
      return {
        startDate: new Date(academicYear + 1, 0, 1), // 1 января
        endDate: new Date(academicYear + 1, 2, 31), // 31 марта
        label: `3 четверть`
      };
    case 'quarter4':
      return {
        startDate: new Date(academicYear + 1, 3, 1), // 1 апреля
        endDate: new Date(academicYear + 1, 5, 30), // 30 июня
        label: `4 четверть`
      };
    case 'semester1':
      return {
        startDate: new Date(academicYear, 8, 1), // 1 сентября
        endDate: new Date(academicYear, 11, 31), // 31 декабря
        label: `1 полугодие`
      };
    case 'semester2':
      return {
        startDate: new Date(academicYear + 1, 0, 1), // 1 января
        endDate: new Date(academicYear + 1, 5, 30), // 30 июня
        label: `2 полугодие`
      };
    case 'trimester1':
      return {
        startDate: new Date(academicYear, 8, 1), // 1 сентября
        endDate: new Date(academicYear, 10, 30), // 30 ноября
        label: `1 триместр`
      };
    case 'trimester2':
      return {
        startDate: new Date(academicYear, 11, 1), // 1 декабря
        endDate: new Date(academicYear + 1, 1, 28), // 28 февраля
        label: `2 триместр`
      };
    case 'trimester3':
      return {
        startDate: new Date(academicYear + 1, 2, 1), // 1 марта
        endDate: new Date(academicYear + 1, 4, 31), // 31 мая
        label: `3 триместр`
      };
    case 'year':
      return {
        startDate: new Date(academicYear, 8, 1), // 1 сентября
        endDate: new Date(academicYear + 1, 5, 30), // 30 июня
        label: `Год`
      };
    default:
      return {
        startDate: new Date(academicYear, 8, 1),
        endDate: new Date(academicYear, 9, 31),
        label: `1 четверть`
      };
  }
}

/**
 * Получает доступные периоды для класса на основе его настроек
 */
export function getAvailablePeriodsForClass(
  academicPeriodsData: AcademicPeriodsData | undefined
): string[] {
  if (academicPeriodsData?.boundaries && academicPeriodsData.boundaries.length > 0) {
    return academicPeriodsData.boundaries.map(b => b.periodKey);
  }

  // По умолчанию возвращаем четверти (без года, так как он обрабатывается отдельно)
  return ['quarter1', 'quarter2', 'quarter3', 'quarter4'];
}

/**
 * Определяет тип периода для класса
 */
export function getPeriodTypeForClass(
  academicPeriodsData: AcademicPeriodsData | undefined
): AcademicPeriodTypeEnum {
  return academicPeriodsData?.periodType || AcademicPeriodTypeEnum.QUARTERS;
}
