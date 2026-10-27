import {
  DEFAULT_SETTINGS,
  type Settings,
  settings,
} from "@/lib/storage/settings";
import type { ListingFormProps } from "./App";

export const listingFormProps = ({
  autoOpenSidebar,
}: Settings): ListingFormProps => ({ autoOpen: autoOpenSidebar });

export async function readListingFormProps(): Promise<ListingFormProps> {
  return listingFormProps(
    await settings.getValue().catch(() => DEFAULT_SETTINGS),
  );
}
