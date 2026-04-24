const METAFIELD_SELECTION = `
  metafields(identifiers: $identifiers) {
    namespace
    key
    value
    type
  }
`;

/** Storefront API: product search (no metafields — avoids empty identifiers error) */
export const SEARCH_PRODUCTS_BASE = /* GraphQL */ `
  query SearchProducts($query: String!, $first: Int!) {
    products(first: $first, query: $query) {
      edges {
        node {
          id
          title
          handle
          description
          tags
          onlineStoreUrl
          availableForSale
          variants(first: 25) {
            edges {
              node {
                id
                title
                sku
                availableForSale
                price {
                  amount
                  currencyCode
                }
                selectedOptions {
                  name
                  value
                }
              }
            }
          }
        }
      }
    }
  }
`;

/** With configured SHOPIFY_METAFIELD_IDENTIFIERS */
export const SEARCH_PRODUCTS_WITH_METAFIELDS = /* GraphQL */ `
  query SearchProducts($query: String!, $first: Int!, $identifiers: [HasMetafieldsIdentifier!]!) {
    products(first: $first, query: $query) {
      edges {
        node {
          id
          title
          handle
          description
          tags
          onlineStoreUrl
          availableForSale
          ${METAFIELD_SELECTION}
          variants(first: 25) {
            edges {
              node {
                id
                title
                sku
                availableForSale
                price {
                  amount
                  currencyCode
                }
                selectedOptions {
                  name
                  value
                }
              }
            }
          }
        }
      }
    }
  }
`;

export const PRODUCT_BY_HANDLE_BASE = /* GraphQL */ `
  query ProductByHandle($handle: String!) {
    productByHandle(handle: $handle) {
      id
      title
      handle
      description
      tags
      onlineStoreUrl
      availableForSale
      variants(first: 50) {
        edges {
          node {
            id
            title
            sku
            availableForSale
            price {
              amount
              currencyCode
            }
            selectedOptions {
              name
              value
            }
          }
        }
      }
    }
  }
`;

export const PRODUCT_BY_HANDLE_WITH_METAFIELDS = /* GraphQL */ `
  query ProductByHandle($handle: String!, $identifiers: [HasMetafieldsIdentifier!]!) {
    productByHandle(handle: $handle) {
      id
      title
      handle
      description
      tags
      onlineStoreUrl
      availableForSale
      ${METAFIELD_SELECTION}
      variants(first: 50) {
        edges {
          node {
            id
            title
            sku
            availableForSale
            price {
              amount
              currencyCode
            }
            selectedOptions {
              name
              value
            }
          }
        }
      }
    }
  }
`;
