// Shop specific setup constants 
const shopUrl = "https://eplehusettest.myshopify.com"; // Replace with your shop URL
const accessToken = window.VANILLA_CONNECTOR; // Use the injected environment variable

// Cart ID to keep track of user's cart (stored in localStorage)
let cartId = localStorage.getItem('shopify_cart_id') || null;

// GraphQL query for fetching the first x products
const query1 = `query FirstProduct {
    products(first: 2) {
        edges {
            node {
                id
                title
                description
                featuredImage {
                    id
                    url
                }
                variants(first: 1) {
                    edges {
                        node {
                            title
                            id
                            priceV2 {
                                amount
                                currencyCode
                            }
                        }
                    }
                }
            }
        }
    }
}`;

// GraphQL mutation for creating a cart
const cartCreateMutation = `
  mutation cartCreate($lines: [CartLineInput!]!) {
    cartCreate(input: {lines: $lines}) {
      cart {
        id
        lines(first: 5) {
          edges {
            node {
              id
              merchandise {
                ... on ProductVariant {
                  id
                  title
                }
              }
              quantity
            }
          }
        }
      }
    }
  }
`;

// GraphQL mutation for adding products to an existing cart
const cartLinesAddMutation = `
  mutation cartLinesAdd($cartId: ID!, $lines: [CartLineInput!]!) {
    cartLinesAdd(cartId: $cartId, lines: $lines) {
      cart {
        id
        lines(first: 5) {
          edges {
            node {
              id
              merchandise {
                ... on ProductVariant {
                  id
                  title
                }
              }
              quantity
            }
          }
        }
      }
    }
  }
`;

// Function to render a product dynamically on the page
function renderProduct(product) {
    const productContainer = document.getElementById('product-container');

    // Create the product card element
    const productCard = document.createElement('div');
    productCard.classList.add('product-card');

    const productImage = product.featuredImage ? product.featuredImage.url : '';
    const productAltText = product.title || 'No image available';

    // Add product information
    productCard.innerHTML = `
        <img src="${productImage}" alt="${productAltText}" style="width:100%; height:auto; border-radius: 8px; margin-bottom: 15px;">
        <h2>${product.title}</h2>
        <p>${product.description}</p>
        <p class="product-price">${product.variants.edges[0].node.priceV2.amount} ${product.variants.edges[0].node.priceV2.currencyCode}</p>
        <button onclick="addToCart('${product.variants.edges[0].node.id}')">Add to Shopify cart</button>
    `;

    // Append the product card to the container
    productContainer.appendChild(productCard);
}

// Function to fetch and render the first x products
const fetchQuery1 = () => {
    console.log("Query 1 running");
    const optionsQuery1 = {
        method: "POST",
        headers: {
            "Content-Type": "application/graphql",
            "X-Shopify-Storefront-Access-Token": accessToken
        },
        body: query1
    };

    // Fetch the data and process each product
    fetch(shopUrl + `/api/2024-07/graphql`, optionsQuery1)
        .then(res => res.json())
        .then(response => {
            console.log(response)
            const products = response.data.products.edges;

            console.log("=============== Fetch Products ===============");
            console.log(JSON.stringify(products, null, 4));

            // Loop through each product and render it
            products.forEach(productEdge => {
                const product = productEdge.node;
                renderProduct(product);
            });
        })
        .catch(error => {
            console.error("Error fetching products:", error);
        });
};

// Function to add a product to the cart
async function addToCart(variantId) {
    const quantity = 1;
    
    // If no cart exists, create a new one
    if (!cartId) {
        console.log("Creating a new cart...");
        const createCartData = await fetch(shopUrl + `/api/2024-07/graphql`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "X-Shopify-Storefront-Access-Token": accessToken
            },
            body: JSON.stringify({
                query: cartCreateMutation,
                variables: {
                    lines: [{ merchandiseId: variantId, quantity: quantity }]
                }
            })
        }).then(res => res.json());
        
        // Save the new cart ID to localStorage
        cartId = createCartData.data.cartCreate.cart.id;
        localStorage.setItem('shopify_cart_id', cartId);
        console.log("New cart created:", cartId);
    } else {
        // If a cart already exists, update it by adding the new product
        console.log("Adding product to existing cart...");
        const updateCartData = await fetch(shopUrl + `/api/2024-07/graphql`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "X-Shopify-Storefront-Access-Token": accessToken
            },
            body: JSON.stringify({
                query: cartLinesAddMutation,
                variables: {
                    cartId: cartId,
                    lines: [{ merchandiseId: variantId, quantity: quantity }]
                }
            })
        }).then(res => res.json());
        
        console.log("Product added to cart:", updateCartData);
    }
}

// Start fetching and rendering products
fetchQuery1();