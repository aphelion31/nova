import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("login", "routes/login.tsx"),
  route("room/:roomName", "routes/room.tsx"),
  route("embed/:roomName", "routes/embed.tsx"),
  route(":roomName", "routes/room.tsx", { id: "direct-room" }),
  route("*", "routes/not-found.tsx"),
] satisfies RouteConfig;
