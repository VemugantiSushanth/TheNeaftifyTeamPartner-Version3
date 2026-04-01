// import { Stack } from "expo-router";

// export default function Layout() {
//   return (
//     <Stack screenOptions={{ headerShown: false }}>
//       {/* Login Screen - default animation */}
//       <Stack.Screen
//         name="login"
//         options={{
//           animation: "slide_from_right", // or whatever you prefer
//         }}
//       />

//       {/* My Role (Home) - fade animation */}
//       <Stack.Screen
//         name="my-role"
//         options={{
//           animation: "fade",
//         }}
//       />
//     </Stack>
//   );
// }

import { Stack } from "expo-router";

export default function Layout() {
  return (
    <Stack
      screenOptions={{
        animation: "slide_from_right", // ✅ main effect
        gestureEnabled: true, // ✅ swipe back
        gestureDirection: "horizontal",

        // 👇 Makes it feel premium like Urban Company
        animationDuration: 250, // smooth & fast

        headerShown: false,
      }}
    />
  );
}
