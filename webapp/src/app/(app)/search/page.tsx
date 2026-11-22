import type { Metadata } from "next";
import { SearchView } from "./search-view";

export const metadata: Metadata = { title: "さがす" };

export default function SearchPage() {
  return <SearchView />;
}
