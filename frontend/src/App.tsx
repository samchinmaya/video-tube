import { Clapperboard } from "lucide-react";
import { Link, Route, Routes } from "react-router";
import { Layout, RequireAuth } from "./components/Layout";
import { EmptyState } from "./components/ui";
import { Login, Register } from "./pages/Auth";
import { Channel } from "./pages/Channel";
import { Home, Liked, Results, Subscriptions, WatchHistory } from "./pages/Feeds";
import { Settings, Upload } from "./pages/Studio";
import { Watch } from "./pages/Watch";

function NotFound() {
  return (
    <EmptyState icon={<Clapperboard />} title="This page isn't available">
      The link may be broken or the page may have been removed.{" "}
      <Link to="/" className="text-blue-400 hover:underline">
        Go home
      </Link>
    </EmptyState>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="results" element={<Results />} />
        <Route path="watch/:videoId" element={<Watch />} />
        <Route path="c/:username" element={<Channel />} />
        <Route path="subscriptions" element={<RequireAuth><Subscriptions /></RequireAuth>} />
        <Route path="history" element={<RequireAuth><WatchHistory /></RequireAuth>} />
        <Route path="liked" element={<RequireAuth><Liked /></RequireAuth>} />
        <Route path="upload" element={<RequireAuth><Upload /></RequireAuth>} />
        <Route path="settings" element={<RequireAuth><Settings /></RequireAuth>} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
