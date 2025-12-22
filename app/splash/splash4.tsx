import React, { useEffect, useRef } from "react";
import { Animated, Easing, View } from "react-native";
import { Colors } from "../../constants/colors";
import { Fonts } from "../../constants/fonts";

export default function Splash4({ active }: { active?: boolean }) {
  // 🔹 Animated values
  const bgTranslateY = useRef(new Animated.Value(300)).current;
  const bgOpacity = useRef(new Animated.Value(0)).current;

  const rocketOpacity = useRef(new Animated.Value(0)).current;
  const rocketTranslateY = useRef(new Animated.Value(100)).current;

  const titleOpacity = useRef(new Animated.Value(0)).current;
  const titleTranslateY = useRef(new Animated.Value(30)).current;

  const subtitleOpacity = useRef(new Animated.Value(0)).current;
  const subtitleTranslateY = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    if (active) {
      // Jalankan animasi berurutan
      Animated.sequence([
        // Background naik pelan
        Animated.parallel([
          Animated.timing(bgTranslateY, {
            toValue: 0,
            duration: 1300,
            easing: Easing.out(Easing.exp),
            useNativeDriver: true,
          }),
          Animated.timing(bgOpacity, {
            toValue: 1,
            duration: 1200,
            useNativeDriver: true,
          }),
        ]),

        Animated.delay(300),

        // Roket muncul naik dan sedikit bounce
        Animated.sequence([
          Animated.parallel([
            Animated.timing(rocketOpacity, {
              toValue: 1,
              duration: 700,
              useNativeDriver: true,
            }),
            Animated.timing(rocketTranslateY, {
              toValue: -10,
              duration: 1000,
              easing: Easing.out(Easing.bounce),
              useNativeDriver: true,
            }),
          ]),
          Animated.timing(rocketTranslateY, {
            toValue: 0,
            duration: 300,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
        ]),

        Animated.delay(200),

        // Judul muncul
        Animated.parallel([
          Animated.timing(titleOpacity, {
            toValue: 1,
            duration: 700,
            useNativeDriver: true,
          }),
          Animated.timing(titleTranslateY, {
            toValue: 0,
            duration: 700,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
        ]),

        Animated.delay(150),

        // Subjudul muncul
        Animated.parallel([
          Animated.timing(subtitleOpacity, {
            toValue: 1,
            duration: 700,
            useNativeDriver: true,
          }),
          Animated.timing(subtitleTranslateY, {
            toValue: 0,
            duration: 700,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
        ]),
      ]).start();
    } else {
      // Reset animasi saat halaman lain aktif
      bgTranslateY.setValue(300);
      bgOpacity.setValue(0);
      rocketOpacity.setValue(0);
      rocketTranslateY.setValue(100);
      titleOpacity.setValue(0);
      titleTranslateY.setValue(30);
      subtitleOpacity.setValue(0);
      subtitleTranslateY.setValue(20);
    }
  }, [active]);

  return (
    <View
      style={{
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: Colors.white,
        paddingHorizontal: 20,
      }}
    >
      {/* Background */}
      <Animated.View
        style={{
          position: "absolute",
          backgroundColor: "#E0EDFE",
          width: 350,
          height: 750,
          bottom: 100,
          borderTopEndRadius: 200,
          borderTopLeftRadius: 200,
          top: "25%",
          opacity: bgOpacity,
          transform: [{ translateY: bgTranslateY }],
        }}
      />

      {/* Gambar Roket */}
      <Animated.Image
        source={require("../../assets/images/mail-group.png")}
        style={{
          width: 270,
          height: 270,
          marginBottom: 40,
          opacity: rocketOpacity,
          transform: [{ translateY: rocketTranslateY }],
        }}
        resizeMode="contain"
      />

      {/* Judul */}
      <Animated.Text
        style={[
          Fonts.header1,
          {
            fontSize: 32,
            color: Colors.navy,
            textAlign: "left",
            alignSelf: "flex-start",
            marginBottom: 10,
            marginLeft: 25,
            opacity: titleOpacity,
            transform: [{ translateY: titleTranslateY }],
          },
        ]}
      >
        Saatnya Bekerja {"\n"}Lebih Cepat
      </Animated.Text>

      {/* Subjudul */}
      <Animated.Text
        style={[
          Fonts.paragraphRegularLarge,
          {
            color: Colors.navy,
            textAlign: "left",
            alignSelf: "flex-start",
            marginBottom: 40,
            lineHeight: 22,
            marginLeft: 25,
            opacity: subtitleOpacity,
            transform: [{ translateY: subtitleTranslateY }],
          },
        ]}
      >
        Temukan Kemudahan {"\n"}Mengelola Dokumen Anda.
      </Animated.Text>
    </View>
  );
}
