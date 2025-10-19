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
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (value) {
      try {
        const date = new Date(value);
        if (!isNaN(date.getTime())) {
          setSelectedDate(date);
          setSelectedTime(date.toTimeString().slice(0, 5));
        }
      } catch (error) {
        console.error('Invalid date value');
      }
    } else if (isOpen && !selectedDate) {
      const today = new Date();
      setSelectedDate(today);
      setSelectedTime(today.toTimeString().slice(0, 5));
    }
  }, [value, isOpen, selectedDate]);

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
          return date.toLocaleString('fa-IR', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
          });
        }
      } catch (error) {
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
    newDate.setHours(parseInt(hours), parseInt(minutes));
    onChange(newDate.toISOString());
    setShowTimePicker(true);
  };

  const handleTimeChange = (time: string) => {
    setSelectedTime(time);
    if (selectedDate) {
      const [hours, minutes] = time.split(':');
      const newDate = new Date(selectedDate);
      newDate.setHours(parseInt(hours), parseInt(minutes));
      onChange(newDate.toISOString());
    }
  };

  const generateCalendarDays = () => {
    if (!selectedDate) return [];
    
    const year = selectedDate.getFullYear();
    const month = selectedDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];
    
    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(<div key={`empty-${i}`} className="h-10"></div>);
    }
    
    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const isSelected = selectedDate && selectedDate.getDate() === day;
      const isToday = new Date().getDate() === day && 
                     new Date().getMonth() === month && 
                     new Date().getFullYear() === year;
      
      days.push(
        <button
          key={day}
          onClick={() => handleDateSelect(new Date(year, month, day))}
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
    
    const newDate = new Date(selectedDate);
    if (direction === 'prev') {
      newDate.setMonth(newDate.getMonth() - 1);
    } else {
      newDate.setMonth(newDate.getMonth() + 1);
    }
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
                {selectedDate ? monthNames[selectedDate.getMonth()] : monthNames[new Date().getMonth()]}
              </h3>
              <p className="text-gray-400 text-sm">
                {selectedDate ? selectedDate.getFullYear() : new Date().getFullYear()}
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
