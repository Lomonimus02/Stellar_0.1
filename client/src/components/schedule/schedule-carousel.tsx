import React, { useState, useCallback, useEffect, useRef } from "react";
import useEmblaCarousel from "embla-carousel-react";
import { 
  startOfWeek, 
  endOfWeek, 
  addDays, 
  format, 
  addWeeks, 
  subWeeks,
  isSameDay,
  isBefore,
  isAfter
} from "date-fns";
import { ru } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { ScheduleDayCard, ScheduleDayCardProps } from "./schedule-day-card"; // Added ScheduleDayCardProps
import { Schedule, User, Subject, Class, Grade, UserRoleEnum, Homework } from "@shared/schema";
import { FiChevronLeft, FiChevronRight, FiCalendar } from "react-icons/fi";
import { useIsMobile } from "@/hooks/use-mobile"; // Fixed: useIsMobile is the correct hook

interface ScheduleCarouselProps {
  schedules: Schedule[];
  subjects: Subject[];
  teachers: User[];
  classes: Class[];
  grades?: Grade[];
  homework?: Homework[];
  currentUser?: User | null;
  isAdmin?: boolean;
  canView?: boolean; // Флаг для разрешения просмотра (для директора)
  subgroups?: any[]; // Добавляем подгруппы
  showClassNames?: boolean; // Флаг для отображения имен классов (для общего расписания)
  onAddSchedule?: (date: Date) => void;
  onEditSchedule?: (schedule: Schedule) => void;
  onDeleteSchedule?: (scheduleId: number) => void;
}

export const ScheduleCarousel: React.FC<ScheduleCarouselProps> = ({
  schedules,
  subjects,
  teachers,
  classes,
  grades = [],
  homework = [],
  currentUser = null,
  isAdmin = false,
  canView = false,
  subgroups = [],
  showClassNames = false,
  onAddSchedule,
  onEditSchedule,
  onDeleteSchedule
}) => {
  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [activeIndex, setActiveIndex] = useState(0); // Added activeIndex state
  const isMobile = useIsMobile(); // Fixed: useIsMobile returns a boolean

  const [emblaRef, emblaApi] = useEmblaCarousel({
    loop: false,
    align: "start",
    // On mobile, show one slide at a time. On desktop, show all 7.
    // This will be controlled by adjusting the width of ScheduleDayCard wrapper later if needed,
    // or by setting slidesToScroll / slidesInView options if Embla supports them directly for different breakpoints.
    // For now, focusing on navigation logic.
    dragFree: true
  });

  // Создаем массив дат для текущей недели
  const weekDates = Array.from({ length: 7 }, (_, i) => addDays(currentWeekStart, i));
  
  // Функция обработки прокрутки колесиком мыши для горизонтального скролла
  const handleWheel = useCallback(
    (event: React.WheelEvent<HTMLDivElement>) => {
      if (!emblaApi) return;
      
      // Предотвращаем стандартное поведение прокрутки
      event.preventDefault();

      // Получаем значение прокрутки
      const delta = event.deltaY;
      
      // Настраиваем шаг прокрутки и чувствительность
      // Если deltaY положительное - прокрутка вниз/вправо, иначе - вверх/влево
      const scrollStep = 1; // Количество слайдов для прокрутки за один раз
      const sensitivity = 50; // Минимальная величина прокрутки для реакции
      
      // Прокручиваем только если величина прокрутки превышает порог чувствительности
      if (Math.abs(delta) < sensitivity) return;
      
      try {
        // Используем API Embla Carousel для перехода к следующему/предыдущему слайду
        if (delta > 0) {
          // Прокрутка вперед
          for (let i = 0; i < scrollStep; i++) {
            emblaApi.scrollNext();
          }
        } else {
          // Прокрутка назад
          for (let i = 0; i < scrollStep; i++) {
            emblaApi.scrollPrev();
          }
        }
        
        // Отладочное сообщение
        console.log("Прокрутка выполнена:", delta > 0 ? "вперед" : "назад");
      } catch (error) {
        console.error("Ошибка при прокрутке:", error);
      }
    },
    [emblaApi]
  );
  
  // Обработчики переключения недель
  const goToPreviousWeek = useCallback(() => {
    const newWeekStart = subWeeks(currentWeekStart, 1);
    setCurrentWeekStart(newWeekStart);
  }, [currentWeekStart]);

  const goToNextWeek = useCallback(() => {
    const newWeekStart = addWeeks(currentWeekStart, 1);
    setCurrentWeekStart(newWeekStart);
  }, [currentWeekStart]);

  // Скролл к текущему дню или началу недели, и Embla event listeners
  useEffect(() => {
    if (!emblaApi) return;

    const today = new Date();
    let initialScrollSnap = 0;
    
    // Check if today is within the initial currentWeekStart and currentWeekEnd
    const currentWeekEndForTodayCheck = endOfWeek(currentWeekStart, { weekStartsOn: 1 });
    if (isAfter(today, currentWeekStart) && isBefore(today, currentWeekEndForTodayCheck) || isSameDay(today, currentWeekStart) || isSameDay(today, currentWeekEndForTodayCheck)) {
      initialScrollSnap = weekDates.findIndex(date => isSameDay(date, today));
      if (initialScrollSnap === -1) initialScrollSnap = 0; // Should not happen if logic is correct
    }
    
    emblaApi.scrollTo(initialScrollSnap, true); // true for instant scroll
    setActiveIndex(initialScrollSnap);

    const handleSelect = () => {
      const newSelectedIndex = emblaApi.selectedScrollSnap();
      setActiveIndex(newSelectedIndex);

      // Week update logic for mobile (drag)
      if (isMobile) {
        // If scrolled to the "placeholder" before the first actual day of the week
        if (newSelectedIndex < 0) { // Should not happen with loop:false
            // This case might indicate issues or need adjustment with loop behavior
        }
        // If scrolled to the "placeholder" after the last actual day of the week
        else if (newSelectedIndex >= weekDates.length) { // Should not happen with loop:false
            // This case might indicate issues or need adjustment with loop behavior
        }
      }
    };
    
    // Handles week changes when user drags and releases
    const handleScroll = () => {
        // This event fires on every scroll frame. For week changes, `settle` is better.
    };

    const handleSettle = () => {
      const newSelectedIndex = emblaApi.selectedScrollSnap();
      setActiveIndex(newSelectedIndex); // Update active index on settle as well

      // Logic to change week if carousel has settled at the beginning or end
      // This is more for when the user flings the carousel on mobile.
      if (isMobile) {
        const slidesInView = emblaApi.slidesInView(true); // true for threshold
        // Check if the first slide (index 0) is no longer in view and we've scrolled right
        // OR if the last slide (index 6) is no longer in view and we've scrolled left
        // This logic is simplified and might need refinement based on Embla's behavior.
        // A more robust way is to check the selectedScrollSnap() against boundaries.

        if (newSelectedIndex === 0 && !emblaApi.canScrollPrev()) {
          // Potentially at the very start, but this doesn't mean previous week.
          // Let's refine week change detection.
        } else if (newSelectedIndex === weekDates.length -1 && !emblaApi.canScrollNext()) {
          // Potentially at the very end.
        }
      }
    };
    
    // More robust week change detection using selectedScrollSnap on settle
    // This is particularly for mobile drag/fling.
    // Desktop uses buttons which directly call goToPreviousWeek/goToNextWeek.
    const handleSettleForWeekChange = () => {
      if (!isMobile) return;

      const selectedSnap = emblaApi.selectedScrollSnap();
      // This logic assumes that if we are at snap 0 and try to scroll prev,
      // or at snap 6 and try to scroll next, we should change the week.
      // However, embla's drag behavior might not allow "overscrolling" to trigger this
      // when loop is false. We need to detect when a swipe *would* go past the edge.

      // A simpler approach for mobile: if the user swipes and settles, and the selected
      // index is 0, and their swipe was to the right (intended previous), or index 6 and swipe was to left (intended next).
      // This is hard to detect directly.
      // Alternative: If at index 0 and `emblaApi.target()` is positive (scrolled right from start)
      // Or at index 6 and `emblaApi.target()` is less than scroll progress for index 6 (scrolled left from end)

      // Let's use a simpler logic for now:
      // If the carousel settles on the first card (index 0) and the user *was* trying to scroll further left (e.g. from index 1 to 0)
      // Or if it settles on the last card (index 6) and the user *was* trying to scroll further right (e.g. from index 5 to 6)
      // This still doesn't fully capture the "intent" to go to the next/prev week by overscrolling.

      // The most reliable way for mobile week change on swipe is to check if the selected snap is at an edge
      // *after* a drag. If a drag ends and selectedSnap is 0, and the drag was towards "previous", change week.
      // If selectedSnap is 6 and drag was towards "next", change week.
      // Embla doesn't directly tell us the drag direction that led to the settle.

      // Let's reconsider. The desktop buttons `goToPreviousWeek` and `goToNextWeek` directly change `currentWeekStart`.
      // When `currentWeekStart` changes, the `useEffect` depending on `currentWeekStart` will re-initialize embla or scroll.
      // For mobile, we need a similar mechanism. When the user swipes to the "edge" and releases,
      // we need to trigger `goToPreviousWeek` or `goToNextWeek`.

      // The `onSelect` event updates `activeIndex`.
      // We need to check if `activeIndex` is 0 or 6 *after* a scroll/settle event.
      // If it is, and the scroll was an attempt to go further, then change the week.

      // Perhaps it's better to check during `pointerUp` or a similar event if we are at the edge.
      // Embla's events: `select`, `scroll`, `settle`, `resize`, `destroy`, `pointerDown`, `pointerUp`.

      // On `pointerUp`, if `emblaApi.selectedScrollSnap()` is 0 and the drag was to the right (negative target)
      // or if it's 6 and the drag was to the left (positive target beyond current position).
      // This is getting complex.
      // A simpler initial approach for mobile week change:
      // If `activeIndex` becomes 0 and the *previous* activeIndex was > 0, it implies a scroll towards the start.
      // If `activeIndex` becomes 6 and the *previous* activeIndex was < 6, it implies a scroll towards the end.
      // This doesn't mean we *crossed* the week boundary yet.

      // Let's use the buttons for week changes for now and refine mobile swipe-to-change-week later if this isn't enough.
      // The core requirement is that the top nav updates when currentWeekStart changes.
      // The desktop buttons will change currentWeekStart. We need to ensure mobile can also trigger this.
      // For now, the mobile *day* navigation will *not* trigger a week change, only reflect the current day.
      // The prompt states: "Modify the useEffect or event handlers for emblaApi (e.g., onSelect, onScroll)
      // to detect when the carousel scrolls to a new week... update currentWeekStart"
      // This implies the swipe itself should trigger the week change.

      // If `loop: false`, embla stops at the edges. We need to detect an attempted scroll *beyond* the edge.
      // This might be better handled by invisible "previous week" and "next week" trigger areas
      // or by detecting a vigorous swipe at the edges.

      // Let's try this: if on `settle`, the selected snap is 0, and the drag gesture was "strong" enough
      // towards the previous direction, change week. Similar for next.
      // Embla's `dragFree` makes it tricky. User can fling it.

      // Simpler for now: If the user scrolls and settles, and the new `activeIndex` is 0,
      // and if the `currentWeekStart` is not already "stuck" at some boundary,
      // assume they might want to go to prev week if they tried to scroll past 0.
      // This is imperfect. The original buttons are explicit.

      // Let's assume the mobile day bar is for *intra-week* navigation.
      // Week changes on mobile will happen if we scroll to card 0 and then try to scroll "more" left,
      // or card 6 and try to scroll "more" right.
      // This "more" is the tricky part with `loop: false`.

      // What if we check `emblaApi.canScrollPrev()` and `emblaApi.canScrollNext()`?
      // When `activeIndex` is 0, `canScrollPrev()` is false.
      // When `activeIndex` is 6, `canScrollNext()` is false.

      // If a `settle` event occurs, and `emblaApi.selectedScrollSnap()` is 0,
      // and the *prior* state (e.g., during `scroll` or `pointerDown`) indicated movement towards left,
      // then trigger `goToPreviousWeek`.
      // This requires tracking drag state, which is complex.

      // Back to the prompt: "detect when the carousel scrolls to a new week".
      // This means the *act of scrolling itself* should trigger it.
      // If `emblaApi.scrollProgress()` reaches < 0 or > 1 (if loop was true), that would be an indicator.
      // With `loop: false`, progress stays between 0 and 1.

      // Let's use a ref to track the previous `activeIndex` to infer direction.
      // And if we hit an edge (0 or 6), we trigger week change.
    };
    
    let previousIndexRef = emblaApi.selectedScrollSnap();

    const handleSettleForWeekChangeLogic = () => {
      if (!isMobile) return; // Only for mobile swipe interaction

      const currentSnap = emblaApi.selectedScrollSnap();
      const previousSnap = previousIndexRef;
      
      // Update previous index for next event
      previousIndexRef = currentSnap;

      // If settled at the first slide (index 0) and was previously > 0 (scrolled left to reach 0)
      if (currentSnap === 0 && previousSnap > currentSnap) {
        // User swiped left to reach the beginning of the week.
        // To go to the *previous* week, they need to swipe left *again* when at index 0.
        // This event alone doesn't mean "go to previous week".
        // This is where it's tricky without "over-scroll" feedback.

        // The prompt implies the scroll itself should trigger the week change.
        // This could mean that if the scroll *action* ends up at index 0, and it was a "strong" scroll from further in the week,
        // or if the user tries to drag further left from index 0.

        // Let's assume for now that hitting the edge *and* intending to go further changes the week.
        // This "intending to go further" is hard to detect with Embla's default events when loop=false.

        // Simpler: If the carousel settles at index 0, and the user *initiated* the scroll from index 0 (e.g. a small twitch left),
        // then change to previous week. This is also tricky.

        // Let's re-read "detect when the carousel scrolls to a new week".
        // This can be interpreted as: when the displayed cards fully shift to represent a new set of 7 days.
        // This happens when `currentWeekStart` is changed.
        // So, the question is what *action* on mobile causes `currentWeekStart` to change.

        // If `slidesToScroll` was effectively 7, then any scroll would be a week change.
        // But here, we scroll one day at a time on mobile.

        // The most straightforward interpretation for mobile:
        // If the user is at the first day (activeIndex 0) and performs a swipe gesture that would normally
        // scroll left (e.g. swipe right), then `goToPreviousWeek()`.
        // If at the last day (activeIndex 6) and performs a swipe gesture that would normally
        // scroll right (e.g. swipe left), then `goToNextWeek()`.

        // Embla's `pointerUp` event might be useful here.
        // We need to check `emblaApi.target()` relative to `emblaApi.scrollSnapList()`.
      } else if (currentSnap === weekDates.length - 1 && previousSnap < currentSnap) {
        // User swiped right to reach the end of the week.
      }
    };

    // This effect re-runs if currentWeekStart changes, which is correct.
    // It will re-initialize scroll position.
    // We need to add listeners.
    emblaApi.on("select", handleSelect);
    // emblaApi.on("scroll", handleScroll); // Probably too noisy for week changes
    emblaApi.on("settle", handleSettle); // Good for updating activeIndex
    // emblaApi.on("settle", handleSettleForWeekChangeLogic); // Add logic for week changes on swipe

    // Cleanup
    return () => {
      emblaApi.off("select", handleSelect);
      // emblaApi.off("scroll", handleScroll);
      emblaApi.off("settle", handleSettle);
      // emblaApi.off("settle", handleSettleForWeekChangeLogic);
    };
  }, [emblaApi, currentWeekStart, weekDates, isMobile]); // Added isMobile and weekDates

  // This useEffect handles Embla event listeners including mobile swipe-to-change-week logic.
  useEffect(() => {
    if (!emblaApi) return; // emblaApi check for all subsequent logic

    // Initial scroll setup & activeIndex update on select/settle (for all views)
    const today = new Date();
    let initialScrollSnap = 0;
    const currentWeekEndForTodayCheck = endOfWeek(currentWeekStart, { weekStartsOn: 1 });
    if (isAfter(today, currentWeekStart) && isBefore(today, currentWeekEndForTodayCheck) || isSameDay(today, currentWeekStart) || isSameDay(today, currentWeekEndForTodayCheck)) {
      initialScrollSnap = weekDates.findIndex(date => isSameDay(date, today));
      if (initialScrollSnap === -1) initialScrollSnap = 0;
    }
    emblaApi.scrollTo(initialScrollSnap, true);
    setActiveIndex(initialScrollSnap);

    const handleSelectOrSettle = () => { // Combined handler for select and settle
      setActiveIndex(emblaApi.selectedScrollSnap());
    };
    emblaApi.on('select', handleSelectOrSettle); // Update activeIndex quickly during scroll
    emblaApi.on('settle', handleSelectOrSettle); // Ensure activeIndex is correct when scroll settles

    // Mobile-specific swipe-to-change-week logic
    if (isMobile) {
      let initialPointerX: number | null = null;
      let currentPointerX: number | null = null;
      let initialDragSnap: number | null = null;
      const MIN_SWIPE_DISTANCE = 50; // Minimum pixels to consider it a swipe for week change

      const recordPointerPosition = (event: PointerEvent | TouchEvent) => {
        const point = 'touches' in event ? event.touches[0] : event;
        return point.clientX;
      };

      const handleMobilePointerDown = (event: PointerEvent | TouchEvent) => {
        initialDragSnap = emblaApi.selectedScrollSnap();
        initialPointerX = recordPointerPosition(event);
        currentPointerX = initialPointerX;

        window.addEventListener('pointermove', handleMobilePointerMove);
        window.addEventListener('touchmove', handleMobilePointerMove, { passive: false });
        window.addEventListener('pointerup', handleMobilePointerUp);
        window.addEventListener('touchend', handleMobilePointerUp);
      };

      const handleMobilePointerMove = (event: PointerEvent | TouchEvent) => {
        if (initialPointerX !== null) {
          currentPointerX = recordPointerPosition(event);
        }
      };

      const handleMobilePointerUp = () => {
        if (initialPointerX === null || currentPointerX === null || initialDragSnap === null) {
          cleanupMobilePointerListeners();
          return;
        }

        const pointerMovedDistance = currentPointerX - initialPointerX;
        const selectedSnap = emblaApi.selectedScrollSnap();

        if (initialDragSnap === 0 && selectedSnap === 0 && pointerMovedDistance > MIN_SWIPE_DISTANCE) {
          goToPreviousWeek();
        } else if (initialDragSnap === weekDates.length - 1 && selectedSnap === weekDates.length - 1 && pointerMovedDistance < -MIN_SWIPE_DISTANCE) {
          goToNextWeek();
        }

        cleanupMobilePointerListeners();
      };

      const cleanupMobilePointerListeners = () => {
        window.removeEventListener('pointermove', handleMobilePointerMove);
        window.removeEventListener('touchmove', handleMobilePointerMove);
        window.removeEventListener('pointerup', handleMobilePointerUp);
        window.removeEventListener('touchend', handleMobilePointerUp);
        initialPointerX = null;
        currentPointerX = null;
        initialDragSnap = null;
      };

      // FIX: Use emblaRef.current instead of emblaApi.viewportNode()
      const viewportNode = emblaRef.current;
      if (viewportNode) {
        viewportNode.addEventListener('pointerdown', handleMobilePointerDown as EventListener);
        viewportNode.addEventListener('touchstart', handleMobilePointerDown as EventListener, { passive: true });
      }

      // Cleanup for mobile-specific listeners
      return () => {
        emblaApi.off('select', handleSelectOrSettle);
        emblaApi.off('settle', handleSelectOrSettle);
        if (viewportNode) {
          viewportNode.removeEventListener('pointerdown', handleMobilePointerDown as EventListener);
          viewportNode.removeEventListener('touchstart', handleMobilePointerDown as EventListener);
        }
        cleanupMobilePointerListeners();
      };
    } else {
      // Cleanup for non-mobile (desktop) if only select/settle were added
      return () => {
        emblaApi.off('select', handleSelectOrSettle);
        emblaApi.off('settle', handleSelectOrSettle);
      };
    }
  }, [emblaApi, isMobile, currentWeekStart, weekDates, goToPreviousWeek, goToNextWeek, setActiveIndex]);
  // weekDates is included because its length is used in swipe logic.


  // Получаем дни недели на русском
  const getDayName = (date: Date) => {
    return format(date, "EEEE", { locale: ru });
  };
  
  const getDayAbbreviation = (date: Date) => {
    return format(date, "EEE", { locale: ru }).toUpperCase(); // ПН, ВТ, СР...
  };

  // Фильтруем расписание для конкретного дняx
  const getSchedulesForDate = (date: Date) => {
    const formattedDate = format(date, "yyyy-MM-dd");
    
    const filteredSchedules = schedules.filter(schedule => {
      // Фильтрация по дате, если установлена конкретная дата
      if (schedule.scheduleDate) {
        // Используем сравнение дат без времени (только год, месяц, день)
        const scheduleDate = new Date(schedule.scheduleDate);
        return format(scheduleDate, "yyyy-MM-dd") === format(date, "yyyy-MM-dd");
      }
      
      // Фильтрация по дню недели
      // JS: 0 - воскресенье, 1 - понедельник, ..., 6 - суббота
      // API: 1 - понедельник, 2 - вторник, ..., 7 - воскресенье
      const dayOfWeek = date.getDay() === 0 ? 7 : date.getDay();
      return schedule.dayOfWeek === dayOfWeek;
    });
    
    // Отладочный вывод
    console.log(`Расписание на ${formattedDate}:`, filteredSchedules);
    if (filteredSchedules.length > 0) {
      filteredSchedules.forEach(schedule => {
        if (schedule.assignments && schedule.assignments.length > 0) {
          console.log(`Найдены задания для расписания ${schedule.id}:`, schedule.assignments);
        }
      });
    }
    
    return filteredSchedules;
  };

  const currentWeekEnd = endOfWeek(currentWeekStart, { weekStartsOn: 1 });
  // const weekRangeText = `${format(currentWeekStart, "d MMM", { locale: ru })} - ${format(currentWeekEnd, "d MMM yyyy", { locale: ru })}`;
  // Adjusted to show month and year, e.g., "Июнь 2025" or "Май - Июнь 2025" if week spans two months.
  // Or always show full range like "Май 27 - Июнь 2, 2024"
  const formatMonthYear = (date: Date) => format(date, "LLLL yyyy", { locale: ru });
  const startMonthYear = formatMonthYear(currentWeekStart);
  const endMonthYear = formatMonthYear(currentWeekEnd);
  const weekRangeText = startMonthYear === endMonthYear 
    ? startMonthYear 
    : `${format(currentWeekStart, "MMM", { locale: ru })} - ${format(currentWeekEnd, "MMM yyyy", { locale: ru })}`;


  const handleDayNavClick = (index: number) => {
    if (emblaApi) {
      emblaApi.scrollTo(index);
      setActiveIndex(index);
    }
  };
  
  // Function to handle week changes from mobile swipe (simplified)
  // This function is called when a swipe gesture indicates a desire to change week.
  const changeWeekFromSwipe = (direction: 'prev' | 'next') => {
    if (!isMobile) return;
    if (direction === 'prev') {
      goToPreviousWeek();
    } else {
      goToNextWeek();
    }
  };

  // This useEffect will attempt to change week if a swipe happens at the carousel edge
  useEffect(() => {
    if (!emblaApi || !isMobile) return;

    const handleSettle = () => {
      const selectedSnap = emblaApi.selectedScrollSnap();
      // This is tricky. We need to know if the *gesture* was an attempt to go further.
      // Let's assume if the user flings and it lands on 0 or 6, that's not enough.
      // They need to be *on* 0 and swipe left, or *on* 6 and swipe right.

      // Placeholder for more advanced swipe-to-change-week logic
      // This might involve listening to pointerdown/move/up to determine swipe intent and velocity at edges.
      // For now, we'll rely on the user reaching the edge and then perhaps an explicit action or a more refined hook.
    };

    emblaApi.on('settle', handleSettle);
    return () => emblaApi.off('settle', handleSettle);
  }, [emblaApi, isMobile, goToPreviousWeek, goToNextWeek]);


  return (
    <div className="h-full flex flex-col bg-transparent"> {/* Added bg-transparent for visionOS feel */}
      {/* Month/Year Indicator and Desktop Navigation Controls */}
      <div className={`flex flex-wrap justify-between items-center mb-1 xs:mb-2 gap-1 px-1 flex-shrink-0 ${isMobile ? 'sm:flex-none' : ''}`}>
        {!isMobile && (
          <Button 
            variant="outline" // Basic styling, CSS will refine
            onClick={goToPreviousWeek}
            className="gap-1 text-xs sm:text-sm h-8 xs:h-9 flex-shrink-0 bg-white/30 backdrop-blur-md border-white/50 text-gray-800" // visionOS hint
            size="sm"
          >
            <FiChevronLeft className="shrink-0" /> 
            <span className="hidden sm:inline">Пред. неделя</span>
            <span className="sm:hidden">Пред.</span>
          </Button>
        )}
        
        <div className={`flex items-center text-sm xs:text-base sm:text-lg font-medium ${isMobile ? 'justify-center w-full order-first mb-1' : 'sm:order-none w-full sm:w-auto justify-center mb-1 sm:mb-0'}`}>
          <FiCalendar className="mr-1 shrink-0 text-gray-700" /> {/* Basic styling */}
          <span className="text-gray-800">{weekRangeText}</span> {/* Basic styling */}
        </div>
        
        {!isMobile && (
          <Button 
            variant="outline" // Basic styling
            onClick={goToNextWeek}
            className="gap-1 text-xs sm:text-sm h-8 xs:h-9 flex-shrink-0 bg-white/30 backdrop-blur-md border-white/50 text-gray-800" // visionOS hint
            size="sm"
          >
            <span className="hidden sm:inline">След. неделя</span>
            <span className="sm:hidden">След.</span>
            <FiChevronRight className="shrink-0" />
          </Button>
        )}
      </div>

      {/* Mobile Top Day Navigation Bar */}
      {isMobile && (
        <div className="sticky top-0 z-20 mb-2 px-1 flex justify-around items-center bg-gray-100/70 backdrop-blur-md shadow-sm rounded-lg py-1.5">
          {weekDates.map((date, index) => (
            <button
              key={format(date, "yyyy-MM-dd'-nav'")}
              onClick={() => handleDayNavClick(index)}
              // Basic styling for visionOS feel: semi-transparent background, rounded corners for active.
              // 'active-day-style' will be defined in CSS for better active state.
              className={`flex flex-col items-center justify-center p-1 rounded-md transition-all duration-200 ease-in-out
                          text-xs font-medium w-12 h-12
                          ${activeIndex === index 
                            ? 'bg-blue-500 text-white shadow-lg scale-105 active-day-style' // Active day
                            : 'text-gray-700 hover:bg-gray-200/70' // Inactive day
                          }`}
            >
              <span className="text-[10px]">{getDayAbbreviation(date)}</span>
              <span className="font-semibold">{format(date, "d")}</span>
            </button>
          ))}
        </div>
      )}
      
      {/* Carousel for Schedule Cards */}
      <div className="overflow-hidden touch-pan-y overscroll-x-none flex-grow" ref={emblaRef} onWheel={handleWheel}>
        <div className="flex h-full gap-1 xs:gap-1.5 sm:gap-2 md:gap-3"> {/* Adjusted gap slightly */}
          {weekDates.map((date, index) => (
            // Adjusted width for mobile to be full width, desktop can show more.
            // On mobile, each card should ideally take up the full viewport width of the carousel.
            // On desktop, the original w-[calc(100%/7-0.4rem)] allows seeing all 7 days.
            // This conditional width needs careful testing with Embla's `align` and `slidesToScroll` settings.
            // For now, let's assume CSS or further refinement will handle the card width for different views.
            // The key is that on mobile, one card is focused, and on desktop, all 7 are visible.
            // The current `w-[calc(100%/7-0.4rem)]` might be fine if Embla is configured for 1 slide on mobile.
            // If not, we might need to set width to `w-full` for mobile.
            <div 
              className={`flex-shrink-0 h-full 
                          ${isMobile ? 'w-full' : 'w-[calc(100%/7-0.5rem)]'} 
                          min-w-[280px] sm:min-w-[300px] max-w-[450px]`} // Adjusted min/max widths
              key={format(date, "yyyy-MM-dd'-card'")}
            >
              <ScheduleDayCard
                date={date}
                dayName={getDayName(date)}
                isDesktopActiveCard={!isMobile && activeIndex === index} // Pass active state for desktop
                schedules={getSchedulesForDate(date)}
                subjects={subjects}
                teachers={teachers}
                classes={classes}
                grades={grades}
                homework={homework}
                currentUser={currentUser}
                isAdmin={isAdmin}
                canView={canView}
                subgroups={subgroups}
                showClassNames={showClassNames}
                onAddSchedule={onAddSchedule}
                onEditSchedule={onEditSchedule}
                onDeleteSchedule={onDeleteSchedule}
                // Pass a dummy prop to ensure re-render if needed, or manage through key/state
                // activeMobileIndex={isMobile ? activeIndex : -1} 
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};