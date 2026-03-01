describe("App Launch", () => {
  it("should launch without crashing", async () => {
    const title = await browser.getTitle();
    expect(title).toBe("WSL Nexus");
  });

  it("should display the header branding", async () => {
    const appName = await $("h1");
    await appName.waitForDisplayed({ timeout: 10_000 });
    const text = await appName.getText();
    expect(text).toContain("WSL Nexus");
  });

  it("should render navigation tabs", async () => {
    const distrosTab = await $('[data-testid="nav-distributions"]');
    const monitoringTab = await $('[data-testid="nav-monitoring"]');
    const settingsTab = await $('[data-testid="nav-settings"]');

    await expect(distrosTab).toBeDisplayed();
    await expect(monitoringTab).toBeDisplayed();
    await expect(settingsTab).toBeDisplayed();
  });

  it("should navigate between tabs", async () => {
    const monitoringTab = await $('[data-testid="nav-monitoring"]');
    await monitoringTab.click();
    await browser.pause(500);

    const settingsTab = await $('[data-testid="nav-settings"]');
    await settingsTab.click();
    await browser.pause(500);

    const distrosTab = await $('[data-testid="nav-distributions"]');
    await distrosTab.click();
    await browser.pause(500);

    await expect(distrosTab).toBeDisplayed();
  });
});
