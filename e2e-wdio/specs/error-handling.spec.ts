describe("Error Handling (no WSL)", () => {
  it("should not crash on the distributions page", async () => {
    const distrosTab = await $('[data-testid="nav-distributions"]');
    await distrosTab.click();
    await browser.pause(1000);

    // The app should still be responsive even if wsl.exe is not available
    const title = await browser.getTitle();
    expect(title).toBe("WSL Nexus");
  });

  it("should not crash on the monitoring page", async () => {
    const monitoringTab = await $('[data-testid="nav-monitoring"]');
    await monitoringTab.click();
    await browser.pause(1000);

    const title = await browser.getTitle();
    expect(title).toBe("WSL Nexus");
  });

  it("should not crash on the settings page", async () => {
    const settingsTab = await $('[data-testid="nav-settings"]');
    await settingsTab.click();
    await browser.pause(1000);

    const title = await browser.getTitle();
    expect(title).toBe("WSL Nexus");
  });
});
