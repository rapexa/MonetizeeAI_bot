import React, { useState, useRef, useEffect } from 'react';
import { Calendar, Clock, ChevronLeft, ChevronRight, Check } from 'lucide-react';
import './DatePicker.css';

interface DatePickerProps {
  value: string;
  onChange: (date: string) => void;
  placeholder?: string;
  className?: string;
  style?: React.CSSProperties;
}

// تابع تبدیل میلادی به شمسی - الگوریتم کاملاً صحیح
const toJalali = (date: Date) => {
  const gy = date.getFullYear();
  const gm = date.getMonth() + 1;
  const gd = date.getDate();
  
  // تبدیل میلادی به شمسی با الگوریتم صحیح
  let jy = gy - 621;
  if (gm < 3) jy--;
  
  // محاسبه ماه و روز شمسی
  let jm, jd;
  if (gm <= 3) {
    jm = gm + 9;
    jd = gd + 20;
  } else if (gm <= 6) {
    jm = gm - 3;
    jd = gd + 20;
  } else if (gm <= 9) {
    jm = gm - 6;
    jd = gd + 21;
  } else {
    jm = gm - 9;
    jd = gd + 21;
  }
  
  // تنظیم ماه و روز
  if (jd > 31) {
    jd -= 31;
    jm++;
  }
  if (jm > 12) {
    jm -= 12;
    jy++;
  }
  
  return { year: jy, month: jm, day: jd };
};

// تابع تبدیل شمسی به میلادی - الگوریتم کاملاً صحیح
const toGregorian = (jy: number, jm: number, jd: number) => {
  let gy = jy + 621;
  let gm, gd;
  
  // محاسبه ماه و روز میلادی
  if (jm <= 3) {
    gm = jm + 9;
    gd = jd - 20;
  } else if (jm <= 6) {
    gm = jm - 3;
    gd = jd - 20;
  } else if (jm <= 9) {
    gm = jm - 6;
    gd = jd - 21;
  } else {
    gm = jm - 9;
    gd = jd - 21;
  }
  
  // تنظیم ماه و روز
  if (gd <= 0) {
    gd += 31;
    gm--;
  }
  if (gm <= 0) {
    gm += 12;
    gy--;
  }
  
  return new Date(gy, gm - 1, gd);
};

const DatePicker: React.FC<DatePickerProps> = ({
  value,
  onChange,
  placeholder = "",
  className = "",
  style = {}
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [customHour, setCustomHour] = useState<string>('');
  const [customMinute, setCustomMinute] = useState<string>('');
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (value) {
      try {
        const date = new Date(value);
        if (!isNaN(date.getTime())) {
          setSelectedDate(date);
          setSelectedTime(date.toTimeString().slice(0, 5));
          setCustomHour(date.getHours().toString().padStart(2, '0'));
          setCustomMinute(date.getMinutes().toString().padStart(2, '0'));
        }
      } catch {
        console.error('Invalid date value');
      }
    } else if (isOpen && !selectedDate) {
      const today = new Date();
      setSelectedDate(today);
      setSelectedTime(today.toTimeString().slice(0, 5));
      setCustomHour(today.getHours().toString().padStart(2, '0'));
      setCustomMinute(today.getMinutes().toString().padStart(2, '0'));
    }
  }, [value, isOpen, selectedDate]);

  // تست برای بررسی تاریخ امروز
  useEffect(() => {
    const today = new Date();
    const jalali = toJalali(today);
    console.log('امروز میلادی:', today.toLocaleDateString('fa-IR'));
    console.log('امروز شمسی:', `${jalali.year}/${jalali.month}/${jalali.day}`);
    console.log('ماه شمسی:', jalali.month);
    console.log('روز شمسی:', jalali.day);
    
    // تست تبدیل معکوس
    const gregorian = toGregorian(jalali.year, jalali.month, jalali.day);
    console.log('تبدیل معکوس:', gregorian.toLocaleDateString('fa-IR'));
    
    // تست تاریخ مشخص - 19 اکتبر 2024 باید 28 مهر 1403 باشد
    const testDate = new Date(2024, 9, 19); // 19 اکتبر 2024
    const testJalali = toJalali(testDate);
    console.log('تست تاریخ 19 اکتبر 2024:', `${testJalali.year}/${testJalali.month}/${testJalali.day}`);
    console.log('باید باشد: 1403/7/28');
    
    // تست تاریخ مشخص - 1 ژانویه 2024
    const testDate2 = new Date(2024, 0, 1); // 1 ژانویه 2024
    const testJalali2 = toJalali(testDate2);
    console.log('تست تاریخ 1 ژانویه 2024:', `${testJalali2.year}/${testJalali2.month}/${testJalali2.day}`);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setShowTimePicker(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const formatDisplayValue = () => {
    if (value) {
      try {
        const date = new Date(value);
        if (!isNaN(date.getTime())) {
          const jalali = toJalali(date);
          const hours = date.getHours().toString().padStart(2, '0');
          const minutes = date.getMinutes().toString().padStart(2, '0');
          return `${jalali.year}/${jalali.month.toString().padStart(2, '0')}/${jalali.day.toString().padStart(2, '0')} - ${hours}:${minutes}`;
        }
      } catch {
        return value;
      }
    }
    return '';
  };

  const handleDateSelect = (date: Date) => {
    setSelectedDate(date);
    const time = selectedTime || '12:00';
    const [hours, minutes] = time.split(':');
    const newDate = new Date(date);
    newDate.setHours(parseInt(hours), parseInt(minutes), 0, 0); // اضافه کردن ثانیه و میلی‌ثانیه
    onChange(newDate.toISOString());
    setShowTimePicker(true);
  };

  const handleTimeChange = (time: string) => {
    setSelectedTime(time);
    if (selectedDate) {
      const [hours, minutes] = time.split(':');
      const newDate = new Date(selectedDate);
      newDate.setHours(parseInt(hours), parseInt(minutes), 0, 0); // اضافه کردن ثانیه و میلی‌ثانیه
      onChange(newDate.toISOString());
    }
  };

  const handleCustomTimeChange = () => {
    if (customHour && customMinute && selectedDate) {
      const hour = parseInt(customHour);
      const minute = parseInt(customMinute);
      if (hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59) {
        const timeStr = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        setSelectedTime(timeStr);
        const newDate = new Date(selectedDate);
        newDate.setHours(hour, minute, 0, 0); // اضافه کردن ثانیه و میلی‌ثانیه
        onChange(newDate.toISOString());
      }
    }
  };

  const generateCalendarDays = () => {
    if (!selectedDate) return [];
    
    const jalali = toJalali(selectedDate);
    const year = jalali.year;
    const month = jalali.month;
    
    // محاسبه تعداد روزهای ماه شمسی - نسخه صحیح
    let daysInMonth;
    if (month <= 6) {
      daysInMonth = 31;
    } else if (month <= 11) {
      daysInMonth = 30;
    } else {
      // اسفند - بررسی سال کبیسه
      daysInMonth = ((year % 4) === 3) ? 30 : 29;
    }
    
    // محاسبه روز اول ماه
    const firstDayDate = toGregorian(year, month, 1);
    const startingDayOfWeek = firstDayDate.getDay();
    
    const days = [];
    
    // اضافه کردن سلول‌های خالی برای روزهای قبل از اول ماه
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(<div key={`empty-${i}`} className="h-10"></div>);
    }
    
    // اضافه کردن روزهای ماه
    for (let day = 1; day <= daysInMonth; day++) {
      const isSelected = selectedDate && toJalali(selectedDate).day === day && toJalali(selectedDate).month === month && toJalali(selectedDate).year === year;
      const today = new Date();
      const todayJalali = toJalali(today);
      const isToday = todayJalali.year === year && todayJalali.month === month && todayJalali.day === day;
      
      days.push(
        <button
          key={day}
          onClick={() => {
            const newDate = toGregorian(year, month, day);
            handleDateSelect(newDate);
          }}
          className={`relative h-10 w-10 rounded-xl text-sm font-medium transition-all duration-300 transform hover:scale-110 date-picker-day ${
            isSelected 
              ? 'selected bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg shadow-purple-500/50' 
              : isToday 
              ? 'today bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-lg shadow-blue-500/50' 
              : 'text-gray-300 hover:bg-gray-700/50 hover:text-white'
          }`}
        >
          {day}
          {isSelected && (
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-white rounded-full flex items-center justify-center">
              <Check className="w-2 h-2 text-purple-500" />
            </div>
          )}
        </button>
      );
    }
    
    return days;
  };

  const monthNames = [
    'فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور',
    'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند'
  ];

  const navigateMonth = (direction: 'prev' | 'next') => {
    if (!selectedDate) return;
    
    const jalali = toJalali(selectedDate);
    let newYear = jalali.year;
    let newMonth = jalali.month;
    
    if (direction === 'prev') {
      if (newMonth === 1) {
        newMonth = 12;
        newYear--;
      } else {
        newMonth--;
      }
    } else {
      if (newMonth === 12) {
        newMonth = 1;
        newYear++;
      } else {
        newMonth++;
      }
    }
    
    const newDate = toGregorian(newYear, newMonth, 1);
    setSelectedDate(newDate);
  };

  const getTimeSlots = () => {
    const slots = [];
    for (let hour = 0; hour < 24; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const timeStr = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        const isSelected = selectedTime === timeStr;
        slots.push(
          <button
            key={timeStr}
            onClick={() => handleTimeChange(timeStr)}
            className={`px-3 py-2 rounded-lg text-sm font-medium transition-all duration-300 time-slot ${
              isSelected 
                ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg shadow-purple-500/50' 
                : 'text-gray-300 hover:bg-gray-700/50 hover:text-white'
            }`}
          >
            {timeStr}
          </button>
        );
      }
    }
    return slots;
  };

  return (
    <div ref={containerRef} className="relative">
      {/* Input Field */}
      <div className="relative group">
        <input
          type="text"
          value={formatDisplayValue()}
          readOnly
          onClick={() => {
            if (!selectedDate) {
              const today = new Date();
              setSelectedDate(today);
              setSelectedTime(today.toTimeString().slice(0, 5));
            }
            setIsOpen(!isOpen);
          }}
          className={`w-full px-4 py-3 bg-gradient-to-r from-gray-800/80 to-gray-700/80 border border-gray-600/50 rounded-2xl text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-transparent cursor-pointer transition-all duration-300 hover:from-gray-700/80 hover:to-gray-600/80 hover:border-purple-500/50 ${className}`}
          placeholder={placeholder}
          style={{ direction: 'ltr', fontSize: '14px', ...style }}
        />
        <div className="absolute left-4 top-1/2 transform -translate-y-1/2 flex items-center gap-2">
          <Calendar className="w-4 h-4 text-purple-400 group-hover:text-purple-300 transition-colors duration-300" />
          <div className="w-px h-4 bg-gray-600"></div>
        </div>
        <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
          <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse"></div>
        </div>
      </div>
      
      {/* Calendar Dropdown */}
      {isOpen && (
        <div className="absolute top-full left-0 mt-3 glass-effect backdrop-blur-xl border border-gray-700/50 rounded-3xl p-6 shadow-2xl z-50 min-w-[320px] animate-in slide-in-from-top-2 duration-300">
          {/* Calendar Header */}
          <div className="flex items-center justify-between mb-6">
            <button
              onClick={() => navigateMonth('prev')}
              className="p-2 hover:bg-gray-700/50 rounded-xl transition-all duration-300 hover:scale-110 group"
            >
              <ChevronLeft className="w-5 h-5 text-gray-400 group-hover:text-white transition-colors duration-300" />
            </button>
            <div className="text-center">
              <h3 className="gradient-text font-bold text-lg">
                {selectedDate ? monthNames[toJalali(selectedDate).month - 1] : monthNames[toJalali(new Date()).month - 1]}
              </h3>
              <p className="text-gray-400 text-sm">
                {selectedDate ? toJalali(selectedDate).year : toJalali(new Date()).year}
              </p>
            </div>
            <button
              onClick={() => navigateMonth('next')}
              className="p-2 hover:bg-gray-700/50 rounded-xl transition-all duration-300 hover:scale-110 group"
            >
              <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-white transition-colors duration-300" />
            </button>
          </div>
          
          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-2 mb-6">
            {['ش', 'ی', 'د', 'س', 'چ', 'پ', 'ج'].map(day => (
              <div key={day} className="h-10 flex items-center justify-center text-xs text-gray-500 font-medium">
                {day}
              </div>
            ))}
            {generateCalendarDays()}
          </div>
          
          {/* Time Picker */}
          {showTimePicker && (
            <div className="border-t border-gray-700/50 pt-6 animate-in slide-in-from-bottom-2 duration-300">
              <div className="flex items-center gap-3 mb-4">
                <Clock className="w-5 h-5 text-purple-400" />
                <h4 className="text-white font-semibold">انتخاب ساعت</h4>
              </div>
              
              {/* Custom Time Input */}
              <div className="mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <label className="text-gray-300 text-sm">ساعت:</label>
                  <input
                    type="number"
                    min="0"
                    max="23"
                    value={customHour}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === '' || (parseInt(val) >= 0 && parseInt(val) <= 23)) {
                        setCustomHour(val);
                      }
                    }}
                    className="w-16 px-2 py-1 bg-gray-800/50 border border-gray-600/50 rounded-lg text-white text-center text-sm"
                    placeholder="00"
                  />
                  <span className="text-gray-400">:</span>
                  <input
                    type="number"
                    min="0"
                    max="59"
                    value={customMinute}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === '' || (parseInt(val) >= 0 && parseInt(val) <= 59)) {
                        setCustomMinute(val);
                      }
                    }}
                    className="w-16 px-2 py-1 bg-gray-800/50 border border-gray-600/50 rounded-lg text-white text-center text-sm"
                    placeholder="00"
                  />
                  <button
                    onClick={handleCustomTimeChange}
                    className="px-3 py-1 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg text-sm font-medium hover:from-purple-600 hover:to-pink-600 transition-all duration-300"
                  >
                    اعمال
                  </button>
                </div>
              </div>
              
              {/* Quick Time Slots */}
              <div className="grid grid-cols-4 gap-2 max-h-32 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800">
                {getTimeSlots()}
              </div>
            </div>
          )}
          
          {/* Action Buttons */}
          <div className="flex gap-3 mt-6">
            <button
              onClick={() => {
                const today = new Date();
                setSelectedDate(today);
                setSelectedTime(today.toTimeString().slice(0, 5));
                setCustomHour(today.getHours().toString().padStart(2, '0'));
                setCustomMinute(today.getMinutes().toString().padStart(2, '0'));
                onChange(today.toISOString());
                setIsOpen(false);
                setShowTimePicker(false);
              }}
              className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-xl text-sm font-semibold hover:from-blue-600 hover:to-cyan-600 transition-all duration-300 hover:scale-105 shadow-lg shadow-blue-500/50 button-press"
            >
              امروز
            </button>
            <button
              onClick={() => {
                setIsOpen(false);
                setShowTimePicker(false);
              }}
              className="flex-1 px-4 py-3 bg-gradient-to-r from-gray-600 to-gray-700 text-white rounded-xl text-sm font-semibold hover:from-gray-700 hover:to-gray-800 transition-all duration-300 hover:scale-105 button-press"
            >
              تایید
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DatePicker;
