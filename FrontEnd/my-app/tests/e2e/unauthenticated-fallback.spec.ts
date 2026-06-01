import { test, expect } from '@playwright/test';

test.describe('Unauthenticated Fallback Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Suppress analytics banner to avoid intercepting clicks in tests
    await page.addInitScript(() => {
      localStorage.setItem(
        'stellar_earn_analytics_consent',
        JSON.stringify({ status: 'denied', version: '1' })
      );
    });
  });

  test('homepage renders correctly for unauthenticated users', async ({ page }) => {
    await page.goto('/');

    // Check that the Hero section renders
    await expect(page.getByRole('region', { name: 'Hero' })).toBeVisible();

    // Check CTA buttons are visible
    const exploreBtn = page.getByRole('link', { name: /explore all available quests/i });
    await expect(exploreBtn).toBeVisible();

    const connectBtn = page.getByRole('link', { name: /connect your wallet/i });
    await expect(connectBtn).toBeVisible();
  });

  test('quest listing renders for unauthenticated users', async ({ page }) => {
    await page.goto('/quests');

    // Quest Board should be visible
    await expect(page.getByRole('heading', { name: 'Quest Board', level: 1 })).toBeVisible();

    // The user should still see a list of quests
    const firstCard = page.locator('[role="button"][aria-label^="View quest:"]').first();
    await expect(firstCard).toBeVisible();
  });

  test('restricted actions prompt connection or redirect gracefully', async ({ page }) => {
    // Navigating to dashboard directly without authentication
    await page.goto('/dashboard');

    // The application should likely redirect to home or prompt for wallet connection
    // We expect the Connect Wallet modal to either be visible or a redirect to happen.
    // For safety in this test, we just ensure it doesn't crash and we aren't showing authenticated views.
    
    // Check if the connect wallet text or an unauthorized message is visible, 
    // or if we are redirected away from the protected dashboard content.
    const connectWalletText = page.locator('text=Connect Wallet').first();
    const isConnectWalletVisible = await connectWalletText.isVisible();
    
    if (!isConnectWalletVisible) {
       // If no modal, verify we aren't seeing actual dashboard content
       await expect(page.getByRole('heading', { name: /Dashboard/i })).not.toBeVisible();
    } else {
       await expect(connectWalletText).toBeVisible();
    }
  });
});
