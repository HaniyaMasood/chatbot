export type Money = { amount: string; currencyCode: string };

export type SelectedOption = { name: string; value: string };

export type MetafieldNode = {
  namespace: string;
  key: string;
  value: string | null;
  type: string;
};

export type VariantNode = {
  id: string;
  title: string;
  sku: string | null;
  availableForSale: boolean;
  price: Money;
  selectedOptions: SelectedOption[];
};

export type ProductNode = {
  id: string;
  title: string;
  handle: string;
  description: string;
  tags: string[];
  onlineStoreUrl: string | null;
  availableForSale: boolean;
  metafields?: (MetafieldNode | null)[] | null;
  variants: {
    edges: Array<{ node: VariantNode }>;
  };
};
