import { Button } from "@07nghiep/ui/components/button";
import { Card, CardContent, CardHeader, CardTitle } from "@07nghiep/ui/components/card";
import { ExternalLink, MapPin } from "lucide-react";

type LocationMapProps = {
  address: string | null | undefined;
  title?: string;
  className?: string;
  mapClassName?: string;
};

function getMapUrl(address: string) {
  const query = encodeURIComponent(address);

  return {
    embed: `https://maps.google.com/maps?q=${query}&output=embed`,
    external: `https://www.google.com/maps/search/?api=1&query=${query}`,
  };
}

export function LocationMap({
  address,
  title = "Bản đồ vị trí",
  className,
  mapClassName = "h-56",
}: LocationMapProps) {
  const normalizedAddress = address?.trim();

  if (!normalizedAddress) return null;

  const mapUrl = getMapUrl(normalizedAddress);

  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-start justify-between gap-3 px-5 pt-5 pb-3">
        <div className="min-w-0">
          <CardTitle className="flex items-center gap-2 text-base">
            <MapPin className="size-4 text-brand-orange" />
            {title}
          </CardTitle>
          <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">
            {normalizedAddress}
          </p>
        </div>
        <Button asChild variant="outline" size="icon-sm" aria-label="Mở Google Maps">
          <a href={mapUrl.external} target="_blank" rel="noreferrer">
            <ExternalLink />
          </a>
        </Button>
      </CardHeader>
      <CardContent className="px-5 pb-5 pt-0">
        <div className={`overflow-hidden rounded-xl border bg-surface-wash ${mapClassName}`}>
          <iframe
            title={title}
            src={mapUrl.embed}
            className="h-full w-full"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
        </div>
      </CardContent>
    </Card>
  );
}
