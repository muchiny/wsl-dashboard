import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { mockListen } from "@/test/mocks/tauri";
import { AlertBadge } from "./alert-badge";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("AlertBadge", () => {
  it("renders nothing when no alerts have been received", () => {
    const { container } = render(<AlertBadge />);
    expect(container.querySelector("span")).toBeNull();
  });

  it("subscribes to alert-triggered event", () => {
    render(<AlertBadge />);
    expect(mockListen).toHaveBeenCalledWith("alert-triggered", expect.any(Function));
  });

  it("shows count after receiving an alert event", () => {
    let capturedCallback: ((event: { payload: unknown }) => void) | undefined;
    mockListen.mockImplementation((_event: string, cb: (event: { payload: unknown }) => void) => {
      capturedCallback = cb;
      return Promise.resolve(vi.fn());
    });

    render(<AlertBadge />);

    act(() => {
      capturedCallback!({
        payload: {
          distro_name: "Ubuntu",
          alert_type: "cpu",
          threshold: 90,
          actual_value: 95,
        },
      });
    });

    expect(screen.getByText("1")).toBeInTheDocument();
  });

  it("increments count for multiple alerts", () => {
    let capturedCallback: ((event: { payload: unknown }) => void) | undefined;
    mockListen.mockImplementation((_event: string, cb: (event: { payload: unknown }) => void) => {
      capturedCallback = cb;
      return Promise.resolve(vi.fn());
    });

    render(<AlertBadge />);

    const alertPayload = {
      distro_name: "Ubuntu",
      alert_type: "cpu",
      threshold: 90,
      actual_value: 95,
    };

    act(() => {
      capturedCallback!({ payload: alertPayload });
      capturedCallback!({ payload: alertPayload });
      capturedCallback!({ payload: alertPayload });
    });

    expect(screen.getByText("3")).toBeInTheDocument();
  });

  it("shows 99+ when count exceeds 99", () => {
    let capturedCallback: ((event: { payload: unknown }) => void) | undefined;
    mockListen.mockImplementation((_event: string, cb: (event: { payload: unknown }) => void) => {
      capturedCallback = cb;
      return Promise.resolve(vi.fn());
    });

    render(<AlertBadge />);

    const alertPayload = {
      distro_name: "Ubuntu",
      alert_type: "cpu",
      threshold: 90,
      actual_value: 95,
    };

    act(() => {
      for (let i = 0; i < 100; i++) {
        capturedCallback!({ payload: alertPayload });
      }
    });

    expect(screen.getByText("99+")).toBeInTheDocument();
  });
});
