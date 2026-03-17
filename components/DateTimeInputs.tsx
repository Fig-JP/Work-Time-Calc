import React, { useRef, useState, useEffect, useCallback } from "react";
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

export function TimeInput({ value, onChange, allowEmpty, placeholder }: TimeInputProps) {
  const minuteRef = useRef<TextInput>(null);
  const hourRef = useRef<TextInput>(null);

  const parseValue = (v: string) => {
    if (!v || !v.includes(":")) return { h: "", m: "" };
    const [h, m] = v.split(":");
    return { h: h ?? "", m: m ?? "" };
  };

  const { h: initH, m: initM } = parseValue(value);

  const [rawH, setRawH] = useState(initH);
  const [rawM, setRawM] = useState(initM);

  const isFocused = useRef(false);
  const prevValue = useRef(value);

  useEffect(() => {
    if (value !== prevValue.current && !isFocused.current) {
      prevValue.current = value;
      const { h, m } = parseValue(value);
      setRawH(h);
      setRawM(m);
    }
  }, [value]);

  const emit = useCallback((h: string, m: string) => {
    if ((!h && !m) && allowEmpty) {
      prevValue.current = "";
      onChange("");
      return;
    }
    const hNum = Math.min(parseInt(h || "0") || 0, 23);
    const mNum = Math.min(parseInt(m || "0") || 0, 59);
    const result = `${String(hNum).padStart(2, "0")}:${String(mNum).padStart(2, "0")}`;
    prevValue.current = result;
    onChange(result);
  }, [onChange, allowEmpty]);

  const handleHourFocus = () => { isFocused.current = true; };

  const handleHourChange = (text: string) => {
    const digits = text.replace(/\D/g, "").slice(0, 2);
    setRawH(digits);
    if (digits.length === 2) {
      emit(digits, rawM);
      minuteRef.current?.focus();
    }
  };

  const handleHourBlur = () => {
    if (rawH) emit(rawH, rawM);
  };

  const handleMinuteFocus = () => { isFocused.current = true; };

  const handleMinuteChange = (text: string) => {
    const digits = text.replace(/\D/g, "").slice(0, 2);
    setRawM(digits);
    if (digits.length === 2) {
      emit(rawH, digits);
    }
    if (digits.length === 0) {
      hourRef.current?.focus();
    }
  };

  const handleMinuteBlur = () => {
    isFocused.current = false;
    if (rawM) emit(rawH, rawM);
  };

  const handleClear = () => {
    if (!allowEmpty) return;
    setRawH("");
    setRawM("");
    prevValue.current = "";
    onChange("");
  };

  const handleActivateEmpty = () => {
    setRawH("09");
    setRawM("00");
    prevValue.current = "09:00";
    onChange("09:00");
    setTimeout(() => hourRef.current?.focus(), 80);
  };

  const isEmpty = allowEmpty && !value;

  return (
    <View style={ts.container}>
      {isEmpty ? (
        <Pressable style={ts.emptyPill} onPress={handleActivateEmpty}>
          <Text style={ts.emptyText}>{placeholder ?? "未入力"}</Text>
        </Pressable>
      ) : (
        <>
          <View style={ts.segment}>
            <TextInput
              ref={hourRef}
              style={ts.segmentInput}
              value={rawH}
              onChangeText={handleHourChange}
              onFocus={handleHourFocus}
              onBlur={handleHourBlur}
              keyboardType="number-pad"
              maxLength={2}
              selectTextOnFocus
              placeholder="00"
              placeholderTextColor={C.textMuted}
            />
          </View>
          <Text style={ts.separator}>:</Text>
          <View style={ts.segment}>
            <TextInput
              ref={minuteRef}
              style={ts.segmentInput}
              value={rawM}
              onChangeText={handleMinuteChange}
              onFocus={handleMinuteFocus}
              onBlur={handleMinuteBlur}
              keyboardType="number-pad"
              maxLength={2}
              selectTextOnFocus
              placeholder="00"
              placeholderTextColor={C.textMuted}
            />
          </View>
          {allowEmpty && (
            <Pressable onPress={handleClear} style={ts.clearBtn} hitSlop={10}>
              <Text style={ts.clearText}>×</Text>
            </Pressable>
          )}
        </>
      )}
    </View>
  );
}

const ts = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  segment: {
    width: 44,
    height: 40,
    backgroundColor: C.backgroundTertiary,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: C.border,
  },
  segmentInput: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    color: C.text,
    textAlign: "center",
    width: "100%",
    height: "100%",
    padding: 0,
    includeFontPadding: false,
  },
  separator: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
    color: C.textSecondary,
    marginHorizontal: 1,
    lineHeight: 24,
  },
  clearBtn: {
    marginLeft: 6,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: C.backgroundTertiary,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: C.border,
  },
  clearText: {
    fontSize: 13,
    color: C.textMuted,
    lineHeight: 20,
    textAlign: "center",
  },
  emptyPill: {
    height: 40,
    paddingHorizontal: 14,
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

  const parseDateValue = (v: string) => {
    if (!v) return { y: "", mo: "", d: "" };
    const parts = v.split("-");
    return { y: parts[0] ?? "", mo: parts[1] ?? "", d: parts[2] ?? "" };
  };

  const { y: initY, mo: initMo, d: initD } = parseDateValue(value);
  const [rawY, setRawY] = useState(initY);
  const [rawMo, setRawMo] = useState(initMo);
  const [rawD, setRawD] = useState(initD);

  const isFocused = useRef(false);
  const prevValue = useRef(value);

  useEffect(() => {
    if (value !== prevValue.current && !isFocused.current) {
      prevValue.current = value;
      const { y, mo, d } = parseDateValue(value);
      setRawY(y);
      setRawMo(mo);
      setRawD(d);
    }
  }, [value]);

  const emit = useCallback((y: string, mo: string, d: string) => {
    if (y.length !== 4) return;
    const moNum = Math.min(Math.max(parseInt(mo || "1") || 1, 1), 12);
    const dNum = Math.min(Math.max(parseInt(d || "1") || 1, 1), 31);
    const result = `${y}-${String(moNum).padStart(2, "0")}-${String(dNum).padStart(2, "0")}`;
    prevValue.current = result;
    onChange(result);
  }, [onChange]);

  const handleYearFocus = () => { isFocused.current = true; };
  const handleYearChange = (text: string) => {
    const digits = text.replace(/\D/g, "").slice(0, 4);
    setRawY(digits);
    if (digits.length === 4) {
      emit(digits, rawMo, rawD);
      monthRef.current?.focus();
    }
  };
  const handleYearBlur = () => { if (rawY.length === 4) emit(rawY, rawMo, rawD); };

  const handleMonthFocus = () => { isFocused.current = true; };
  const handleMonthChange = (text: string) => {
    const digits = text.replace(/\D/g, "").slice(0, 2);
    setRawMo(digits);
    if (digits.length === 2) {
      emit(rawY, digits, rawD);
      dayRef.current?.focus();
    }
    if (digits.length === 0) {
      // backspace from month → go back to year? leave it
    }
  };
  const handleMonthBlur = () => { if (rawMo) emit(rawY, rawMo, rawD); };

  const handleDayFocus = () => { isFocused.current = true; };
  const handleDayChange = (text: string) => {
    const digits = text.replace(/\D/g, "").slice(0, 2);
    setRawD(digits);
    if (digits.length === 2) {
      emit(rawY, rawMo, digits);
    }
  };
  const handleDayBlur = () => {
    isFocused.current = false;
    if (rawD) emit(rawY, rawMo, rawD);
  };

  return (
    <View style={ds.container}>
      <View style={[ds.segment, { width: 60 }]}>
        <TextInput
          style={ds.segmentInput}
          value={rawY}
          onChangeText={handleYearChange}
          onFocus={handleYearFocus}
          onBlur={handleYearBlur}
          keyboardType="number-pad"
          maxLength={4}
          selectTextOnFocus
          placeholder="YYYY"
          placeholderTextColor={C.textMuted}
        />
      </View>
      <Text style={ds.separator}>/</Text>
      <View style={[ds.segment, { width: 40 }]}>
        <TextInput
          ref={monthRef}
          style={ds.segmentInput}
          value={rawMo}
          onChangeText={handleMonthChange}
          onFocus={handleMonthFocus}
          onBlur={handleMonthBlur}
          keyboardType="number-pad"
          maxLength={2}
          selectTextOnFocus
          placeholder="MM"
          placeholderTextColor={C.textMuted}
        />
      </View>
      <Text style={ds.separator}>/</Text>
      <View style={[ds.segment, { width: 40 }]}>
        <TextInput
          ref={dayRef}
          style={ds.segmentInput}
          value={rawD}
          onChangeText={handleDayChange}
          onFocus={handleDayFocus}
          onBlur={handleDayBlur}
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

const ds = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  segment: {
    height: 40,
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
    includeFontPadding: false,
  },
  separator: {
    fontSize: 17,
    fontFamily: "Inter_600SemiBold",
    color: C.textSecondary,
    marginHorizontal: 1,
  },
});
