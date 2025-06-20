/**
 * Утилиты для работы с учебными периодами
 */

export type QuarterType = 'quarter1' | 'quarter2' | 'quarter3' | 'quarter4' | 'semester1' | 'semester2' | 'year';

/**
 * Получает учебный год на основе переданного года
 * @param year - год для определения учебного года
 * @returns начальный год учебного года
 */
export function getAcademicYear(year: number): number {
  const currentMonth = new Date().getMonth();
  // Если текущий месяц сентябрь и позже, то учебный год начинается в текущем году
  // Иначе учебный год начался в предыдущем году
  return currentMonth >= 8 ? year : year - 1;
}

/**
 * Определяет текущий учебный период на основе текущей даты
 * @param currentDate - текущая дата (по умолчанию new Date())
 * @returns объект с информацией о текущем периоде
 */
export function getCurrentAcademicPeriod(currentDate: Date = new Date()): {
  period: QuarterType;
  year: number;
  academicYear: number;
} {
  const currentMonth = currentDate.getMonth(); // 0-11
  const currentYear = currentDate.getFullYear();
  const academicYear = getAcademicYear(currentYear);

  // Определяем период на основе месяца
  let period: QuarterType;

  if (currentMonth >= 8 && currentMonth <= 9) {
    // Сентябрь (8) - Октябрь (9): 1 четверть
    period = 'quarter1';
  } else if (currentMonth >= 10 && currentMonth <= 11) {
    // Ноябрь (10) - Декабрь (11): 2 четверть
    period = 'quarter2';
  } else if (currentMonth >= 0 && currentMonth <= 2) {
    // Январь (0) - Март (2): 3 четверть
    period = 'quarter3';
  } else if (currentMonth >= 3 && currentMonth <= 4) {
    // Апрель (3) - Май (4): 4 четверть
    period = 'quarter4';
  } else {
    // Июнь (5) - Август (7): летние каникулы, показываем 4 четверть
    period = 'quarter4';
  }

  return {
    period,
    year: currentYear,
    academicYear
  };
}

/**
 * Получает даты начала и конца для указанного периода
 * @param period - тип периода
 * @param currentYear - текущий год
 * @returns объект с датами начала и конца периода
 */
export function getPeriodDates(period: QuarterType, currentYear: number): {
  startDate: Date;
  endDate: Date;
  label: string;
} {
  const academicYear = getAcademicYear(currentYear);

  switch (period) {
    case 'quarter1': // 1 четверть: сентябрь - октябрь
      return {
        startDate: new Date(academicYear, 8, 1), // 1 сентября
        endDate: new Date(academicYear, 9, 31), // 31 октября
        label: `1 четверть`
      };

    case 'quarter2': // 2 четверть: ноябрь - декабрь
      return {
        startDate: new Date(academicYear, 10, 1), // 1 ноября
        endDate: new Date(academicYear, 11, 31), // 31 декабря
        label: `2 четверть`
      };

    case 'quarter3': // 3 четверть: январь - март
      return {
        startDate: new Date(academicYear + 1, 0, 1), // 1 января
        endDate: new Date(academicYear + 1, 2, 31), // 31 марта
        label: `3 четверть`
      };

    case 'quarter4': // 4 четверть: апрель - июнь
      return {
        startDate: new Date(academicYear + 1, 3, 1), // 1 апреля
        endDate: new Date(academicYear + 1, 5, 30), // 30 июня
        label: `4 четверть`
      };

    case 'semester1': // 1 полугодие: сентябрь - декабрь
      return {
        startDate: new Date(academicYear, 8, 1), // 1 сентября
        endDate: new Date(academicYear, 11, 31), // 31 декабря
        label: `1 полугодие`
      };

    case 'semester2': // 2 полугодие: январь - июнь
      return {
        startDate: new Date(academicYear + 1, 0, 1), // 1 января
        endDate: new Date(academicYear + 1, 5, 30), // 30 июня
        label: `2 полугодие`
      };

    case 'year': // Учебный год: сентябрь - июнь
      return {
        startDate: new Date(academicYear, 8, 1), // 1 сентября
        endDate: new Date(academicYear + 1, 5, 30), // 30 июня
        label: `Учебный год ${academicYear}-${academicYear + 1}`
      };

    default:
      // По умолчанию возвращаем 1 четверть
      return {
        startDate: new Date(academicYear, 8, 1),
        endDate: new Date(academicYear, 9, 31),
        label: `1 четверть`
      };
  }
}

/**
 * Определяет текущий период для полугодий на основе текущей даты
 * @param currentDate - текущая дата (по умолчанию new Date())
 * @returns период для системы полугодий
 */
export function getCurrentSemesterPeriod(currentDate: Date = new Date()): QuarterType {
  const currentMonth = currentDate.getMonth(); // 0-11

  if (currentMonth >= 8 || currentMonth <= 11) {
    // Сентябрь - Декабрь: 1 полугодие
    return 'semester1';
  } else {
    // Январь - Август: 2 полугодие
    return 'semester2';
  }
}
