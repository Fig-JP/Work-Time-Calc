import React, { useRef, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Pressable,
} from "react-native";
import Colors from "@/constants/colors";

const C = Colors.light;

interface TimeInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  allowEmpty?: boolean;
}

export function TimeInput({ value, onChange, placeholder, allowEmpty }: TimeInputProps) {
  const minuteRef = useRef<TextInput>(null);
  const hourRef = useRef<TextInput>(null);

  const hours = value.includes(":") ? value.split(":")[0] : value.length >= 2 ? value.slice(0, 2) : value;
  const minutes = value.includes(":") ? value.split(":")[1] : "";

  const updateValue = useCallback((h: string, m: string) => {
    if (!h && !m && allowEmpty) {
      onChange("");
      return;
    }
    const hh = h.padStart(2, "0");
    const mm = m.padStart(2, "0");
    onChange(`${hh}:${mm}`);
  }, [onChange, allowEmpty]);

  const handleHourChange = (text: string) => {
    const digits = text.replace(/\D/g, "").slice(0, 2);
    const num = parseInt(digits || "0");
    const clamped = isNaN(num) ? "" : String(Math.min(num, 23));
    updateValue(clamped, minutes);
    if (digits.length === 2) {
      minuteRef.current?.focus();
    }
  };

  const handleMinuteChange = (text: string) => {
    const digits = text.replace(/\D/g, "").slice(0, 2);
    const num = parseInt(digits || "0");
    const clamped = isNaN(num) ? "" : String(Math.min(num, 59));
    updateValue(hours, clamped);
    if (digits.length === 0) {
      hourRef.current?.focus();
    }
  };

  const handleClear = () => {
    if (allowEmpty) {
      onChange("");
      hourRef.current?.focus();
    }
  };

  const displayHours = hours ? hours.padStart(2, "0") : "";
  const displayMinutes = minutes ? minutes.padStart(2, "0") : "";
  const isEmpty = !value && allowEmpty;

  return (
    <View style={timeStyles.container}>
      {isEmpty ? (
        <Pressable style={timeStyles.emptyPill} onPress={() => {
          onChange("09:00");
          setTimeout(() => hourRef.current?.focus(), 50);
        }}>
          <Text style={timeStyles.emptyText}>{placeholder ?? "未入力"}</Text>
        </Pressable>
      ) : (
        <>
          <View style={timeStyles.segment}>
            <TextInput
              ref={hourRef}
              style={timeStyles.segmentInput}
              value={displayHours}
              onChangeText={handleHourChange}
              keyboardType="number-pad"
              maxLength={2}
              selectTextOnFocus
              placeholder="00"
              placeholderTextColor={C.textMuted}
            />
          </View>
          <Text style={timeStyles.separator}>:</Text>
          <View style={timeStyles.segment}>
            <TextInput
              ref={minuteRef}
              style={timeStyles.segmentInput}
              value={displayMinutes}
              onChangeText={handleMinuteChange}
              keyboardType="number-pad"
              maxLength={2}
              selectTextOnFocus
              placeholder="00"
              placeholderTextColor={C.textMuted}
            />
          </View>
          {allowEmpty && (
            <Pressable onPress={handleClear} style={timeStyles.clearBtn} hitSlop={8}>
              <Text style={timeStyles.clearText}>×</Text>
            </Pressable>
          )}
        </>
      )}
    </View>
  );
}

const timeStyles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  segment: {
    width: 40,
    height: 36,
    backgroundColor: C.backgroundTertiary,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: C.border,
  },
  segmentInput: {
    fontSize: 17,
    fontFamily: "Inter_700Bold",
    color: C.text,
    textAlign: "center",
    width: "100%",
    height: "100%",
    padding: 0,
  },
  separator: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    color: C.textSecondary,
    marginHorizontal: 1,
  },
  clearBtn: {
    marginLeft: 4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: C.backgroundTertiary,
    alignItems: "center",
    justifyContent: "center",
  },
  clearText: {
    fontSize: 13,
    color: C.textMuted,
    lineHeight: 18,
  },
  emptyPill: {
    height: 36,
    paddingHorizontal: 12,
    backgroundColor: C.backgroundTertiary,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: C.border,
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
  },
  emptyText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: C.textMuted,
  },
});

interface DateInputProps {
  value: string;
  onChange: (value: string) => void;
}

export function DateInput({ value, onChange }: DateInputProps) {
  const monthRef = useRef<TextInput>(null);
  const dayRef = useRef<TextInput>(null);

  const parts = value.split("-");
  const year = parts[0] ?? "";
  const month = parts[1] ?? "";
  const day = parts[2] ?? "";

  const updateValue = (y: string, mo: string, d: string) => {
    if (y.length === 4 && mo.length <= 2 && d.length <= 2) {
      const mm = mo.padStart(2, "0");
      const dd = d.padStart(2, "0");
      onChange(`${y}-${mm}-${dd}`);
    } else {
      onChange(`${y}-${mo}-${d}`);
    }
  };

  const handleYearChange = (text: string) => {
    const digits = text.replace(/\D/g, "").slice(0, 4);
    updateValue(digits, month, day);
    if (digits.length === 4) {
      monthRef.current?.focus();
    }
  };

  const handleMonthChange = (text: string) => {
    const digits = text.replace(/\D/g, "").slice(0, 2);
    const num = parseInt(digits || "0");
    const clamped = digits.length > 0 ? String(Math.min(Math.max(num, 1), 12)) : "";
    updateValue(year, clamped, day);
    if (digits.length === 2) {
      dayRef.current?.focus();
    }
  };

  const handleDayChange = (text: string) => {
    const digits = text.replace(/\D/g, "").slice(0, 2);
    const num = parseInt(digits || "0");
    const clamped = digits.length > 0 ? String(Math.min(Math.max(num, 1), 31)) : "";
    updateValue(year, month, clamped);
  };

  return (
    <View style={dateStyles.container}>
      <View style={[dateStyles.segment, { width: 56 }]}>
        <TextInput
          style={dateStyles.segmentInput}
          value={year}
          onChangeText={handleYearChange}
          keyboardType="number-pad"
          maxLength={4}
          selectTextOnFocus
          placeholder="YYYY"
          placeholderTextColor={C.textMuted}
        />
      </View>
      <Text style={dateStyles.separator}>/</Text>
      <View style={[dateStyles.segment, { width: 36 }]}>
        <TextInput
          ref={monthRef}
          style={dateStyles.segmentInput}
          value={month.padStart(2, "0")}
          onChangeText={handleMonthChange}
          keyboardType="number-pad"
          maxLength={2}
          selectTextOnFocus
          placeholder="MM"
          placeholderTextColor={C.textMuted}
        />
      </View>
      <Text style={dateStyles.separator}>/</Text>
      <View style={[dateStyles.segment, { width: 36 }]}>
        <TextInput
          ref={dayRef}
          style={dateStyles.segmentInput}
          value={day.padStart(2, "0")}
          onChangeText={handleDayChange}
          keyboardType="number-pad"
          maxLength={2}
          selectTextOnFocus
          placeholder="DD"
          placeholderTextColor={C.textMuted}
        />
      </View>
    </View>
  );
}

const dateStyles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  segment: {
    height: 36,
    backgroundColor: C.backgroundTertiary,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: C.border,
  },
  segmentInput: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
    color: C.text,
    textAlign: "center",
    width: "100%",
    height: "100%",
    padding: 0,
  },
  separator: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    color: C.textSecondary,
    marginHorizontal: 1,
  },
});
