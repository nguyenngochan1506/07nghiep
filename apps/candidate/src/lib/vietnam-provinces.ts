import { useEffect, useState } from "react";

const PROVINCES_API_URL = "https://provinces.open-api.vn/api/p/";

type ProvinceApiItem = {
  code: number;
  name: string;
  division_type: string;
  codename: string;
  phone_code: number;
};

export type VietnamProvince = {
  code: number;
  name: string;
  displayName: string;
};

let provinceCache: VietnamProvince[] | null = null;
let provinceRequest: Promise<VietnamProvince[]> | null = null;

function toDisplayProvinceName(name: string) {
  return name
    .replace(/^Thành phố\s+/i, "")
    .replace(/^Tỉnh\s+/i, "")
    .trim();
}

async function fetchVietnamProvinces() {
  const response = await fetch(PROVINCES_API_URL);

  if (!response.ok) {
    throw new Error("Không tải được danh sách tỉnh thành");
  }

  const provinces = (await response.json()) as ProvinceApiItem[];

  return provinces
    .map((province) => ({
      code: province.code,
      name: province.name,
      displayName: toDisplayProvinceName(province.name),
    }))
    .sort((a, b) => a.displayName.localeCompare(b.displayName, "vi"));
}

export function loadVietnamProvinces() {
  if (provinceCache) {
    return Promise.resolve(provinceCache);
  }

  if (!provinceRequest) {
    provinceRequest = fetchVietnamProvinces()
      .then((provinces) => {
        provinceCache = provinces;
        return provinces;
      })
      .finally(() => {
        provinceRequest = null;
      });
  }

  return provinceRequest;
}

export function useVietnamProvinces() {
  const [provinces, setProvinces] = useState<VietnamProvince[]>(provinceCache ?? []);
  const [isLoading, setIsLoading] = useState(!provinceCache);
  const [isError, setIsError] = useState(false);

  useEffect(() => {
    let cancelled = false;

    setIsLoading(!provinceCache);
    setIsError(false);

    loadVietnamProvinces()
      .then((nextProvinces) => {
        if (!cancelled) {
          setProvinces(nextProvinces);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setIsError(true);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return { provinces, isLoading, isError };
}
