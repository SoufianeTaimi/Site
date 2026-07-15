# Ceramide Store Shopify Theme

A custom Shopify theme for hyper-ceramide.myshopify.com with a professional landing page design.

## Features

- 🎨 Responsive landing page with hero banner
- 📦 Featured products section  
- ⭐ Customer testimonials
- 🛒 Cart integration
- 📱 Mobile-optimized design
- 🚀 Automated GitHub → Shopify deployment

## Project Structure

```
├── assets/           # CSS and JavaScript files
├── config/           # Theme settings schema
├── layout/           # Layout templates
├── templates/        # Page templates
├── sections/         # Reusable section components
├── snippets/         # Reusable snippets
└── theme.json        # Theme metadata
```

## Setup Instructions

### 1. Get Shopify API Credentials

1. Go to your Shopify Admin Dashboard
2. Navigate to **Settings** → **Apps and integrations**
3. Click **Develop apps** (if needed, enable it first)
4. Create a new app and set the following scopes:
   - `write_themes`
   - `read_themes`
5. Install the app and copy your **API access token**

### 2. Get Your Theme ID

Deploy the theme manually once to get its ID:

```bash
shopify theme push --path . --development
```

Note the **Theme ID** from the output.

### 3. Add GitHub Secrets

Go to your GitHub repo settings and add these secrets under **Settings → Secrets and variables → Actions**:

- `SHOPIFY_STORE_URL` - Your store URL (e.g., `hyper-ceramide.myshopify.com`)
- `SHOPIFY_API_TOKEN` - Your API access token
- `SHOPIFY_THEME_ID` - Your theme ID

### 4. Deploy

Push changes to the `theme` branch and the workflow will automatically deploy to Shopify!

```bash
git push origin theme
```

## Manual Deployment

If you prefer manual deployment with Shopify CLI:

```bash
# Install Shopify CLI
npm install -g @shopify/cli

# Push to development theme
shopify theme push --path .

# Push to specific theme
shopify theme push --path . --theme-id YOUR_THEME_ID
```

## Customization

Edit these files to customize your theme:

- **Colors & Fonts**: `config/settings_schema.json`
- **Styles**: `assets/theme.css`
- **Homepage**: `templates/index.liquid`
- **Layout**: `layout/theme.liquid`

## Support

For more information:
- [Shopify Theme Development](https://shopify.dev/themes)
- [Liquid Template Language](https://shopify.dev/themes/architecture/settings/input-settings)
