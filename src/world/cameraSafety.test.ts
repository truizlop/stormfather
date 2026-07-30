import { describe, expect, it } from "vitest";
import {
  auditKharbranthCameraFrustum,
  CAMERA_SURFACE_CLEARANCE,
  KHARBRANTH_STREET_CAMERA_CLEARANCE,
  KHARBRANTH_STREET_TARGET_CLEARANCE,
  LOCAL_CAMERA_MIN_PITCH,
  collisionSafeZoomPose,
  kharbranthCameraExclusionVolumes,
  modeledCameraClearanceRadius,
} from "./cameraSafety";
import {
  cityProximityCandidate,
  nearestCityProximityOwner,
  resolvedCityProximityOwner,
} from "./cities/progressiveLod";
import { detailFromDistance } from "./coordinates";
import { locations } from "./locations";
import { localSurfaceY } from "./terrain/localSurface";

const modeledLocations = locations.filter(
  (location) => location.modelRoot,
);

function cameraDistance(
  position: readonly [number, number, number],
  target: readonly [number, number, number],
) {
  return Math.hypot(
    position[0] - target[0],
    position[1] - target[1],
    position[2] - target[2],
  );
}

describe("collision-safe local camera envelopes", () => {
  it.each(["city", "street"] as const)(
    "keeps every modeled %s detail-button arrival above terrain and at its requested tier",
    (level) => {
      for (const location of modeledLocations) {
        const pose = collisionSafeZoomPose({
          location,
          position: location.camera.position,
          target: location.camera.target,
          factor: level === "street" ? 0.38 : 0.65,
          requestedLevel: level,
        });
        const distance = cameraDistance(pose.position, pose.target);
        const cameraSurface = localSurfaceY(
          location.id,
          pose.position[0],
          pose.position[2],
        );
        const targetSurface = localSurfaceY(
          location.id,
          pose.target[0],
          pose.target[2],
        );

        expect(detailFromDistance(distance), location.id).toBe(level);
        const kharbranthStreet =
          location.id === "kharbranth" && level === "street";
        expect(
          pose.position[1] - cameraSurface,
          location.id,
        ).toBeGreaterThanOrEqual(
          (kharbranthStreet
            ? KHARBRANTH_STREET_CAMERA_CLEARANCE
            : CAMERA_SURFACE_CLEARANCE) - 0.001,
        );
        expect(
          pose.target[1] - targetSurface,
          location.id,
        ).toBeGreaterThanOrEqual(
          (kharbranthStreet
            ? KHARBRANTH_STREET_TARGET_CLEARANCE
            : 0.14) - 0.001,
        );

        if (!kharbranthStreet) {
          const horizontalFromCenter = Math.hypot(
            pose.position[0] - location.coordinates.x,
            pose.position[2] - location.coordinates.z,
          );
          const horizontalLook = Math.hypot(
            pose.position[0] - pose.target[0],
            pose.position[2] - pose.target[2],
          );
          const pitch = Math.atan2(
            pose.position[1] - pose.target[1],
            horizontalLook,
          );
          expect(horizontalFromCenter, location.id).toBeGreaterThanOrEqual(
            modeledCameraClearanceRadius(location, level) - 0.001,
          );
          expect(pitch, location.id).toBeGreaterThanOrEqual(
            LOCAL_CAMERA_MIN_PITCH - 0.001,
          );
        }
      }
    },
  );

  it("keeps the reproduced Shattered Plains street click outside the plateau mass", () => {
    const location = modeledLocations.find(
      (candidate) => candidate.id === "shattered-plains",
    )!;
    const pose = collisionSafeZoomPose({
      location,
      position: location.camera.position,
      target: location.camera.target,
      factor: 0.38,
      requestedLevel: "street",
    });

    expect(detailFromDistance(cameraDistance(pose.position, pose.target))).toBe(
      "street",
    );
    expect(
      Math.hypot(
        pose.position[0] - location.coordinates.x,
        pose.position[2] - location.coordinates.z,
      ),
    ).toBeGreaterThanOrEqual(
      modeledCameraClearanceRadius(location, "street"),
    );
    expect(pose.position[1]).toBeGreaterThan(
      localSurfaceY(
        location.id,
        pose.position[0],
        pose.position[2],
      ) + 0.5,
    );
  });

  it("clamps an aggressive incremental zoom before it crosses a modeled footprint", () => {
    for (const location of modeledLocations.filter(
      (candidate) => candidate.id !== "kharbranth",
    )) {
      const pose = collisionSafeZoomPose({
        location,
        position: location.camera.position,
        target: location.camera.target,
        factor: 0.01,
      });

      expect(
        Math.hypot(
          pose.position[0] - location.coordinates.x,
          pose.position[2] - location.coordinates.z,
        ),
        location.id,
      ).toBeGreaterThanOrEqual(
        modeledCameraClearanceRadius(location, "street") - 0.001,
      );
      expect(
        pose.position[1] -
          localSurfaceY(
            location.id,
            pose.position[0],
            pose.position[2],
          ),
        location.id,
      ).toBeGreaterThanOrEqual(CAMERA_SURFACE_CLEARANCE - 0.001);
    }
  });

  it("keeps Kharbranth's deliberate road-level inspection above its authored lane", () => {
    const location = modeledLocations.find(
      (candidate) => candidate.id === "kharbranth",
    )!;
    const pose = collisionSafeZoomPose({
      location,
      position: location.camera.position,
      target: location.camera.target,
      factor: 0.38,
      requestedLevel: "street",
    });

    expect(detailFromDistance(cameraDistance(pose.position, pose.target))).toBe(
      "street",
    );
    expect(
      pose.position[1] -
        localSurfaceY(
          location.id,
          pose.position[0],
          pose.position[2],
        ),
    ).toBeGreaterThanOrEqual(
      KHARBRANTH_STREET_CAMERA_CLEARANCE - 0.001,
    );
    expect(cameraDistance(pose.position, pose.target)).toBeGreaterThan(0.72);
    expect(cameraDistance(pose.position, pose.target)).toBeLessThan(1.1);

    const subjectAudit = auditKharbranthCameraFrustum(pose, location, {
      ndcSpread: 0.16,
    });
    // The conservative lower-ward box is the intended market backdrop in
    // this human-scale inspection, not a wall surrounding the camera.
    expect(subjectAudit.earliestVolumeHit?.volumeId).toBe(
      "lower-ward-facade-atlas",
    );
    expect(subjectAudit.earliestVolumeHit?.fraction ?? 0).toBeGreaterThan(
      0.5,
    );
    const environmentAudit = auditKharbranthCameraFrustum(
      pose,
      location,
      {
        includeRuntimeOccupancy: false,
        ndcSpread: 0.16,
      },
    );
    expect(environmentAudit.earliestVolumeHit?.volumeId).toBe(
      "lower-ward-facade-atlas",
    );
    expect(
      environmentAudit.earliestVolumeHit?.fraction ?? 0,
    ).toBeGreaterThan(0.5);
    expect(
      environmentAudit.earliestTerrainHitFraction ?? 1,
    ).toBeGreaterThan(0.82);
  });

  it("keeps exact Kharbranth street travel owned by Kharbranth rather than overlapping Thaylen City", () => {
    const location = modeledLocations.find(
      (candidate) => candidate.id === "kharbranth",
    )!;
    const pose = collisionSafeZoomPose({
      location,
      position: location.camera.position,
      target: location.camera.target,
      factor: 0.38,
      requestedLevel: "street",
    });
    const candidates = ["kharbranth", "thaylen-city"].map(
      cityProximityCandidate,
    );

    const cameraOwner = nearestCityProximityOwner(
      pose.position,
      candidates,
      { focusPosition: pose.target },
    );
    expect(cameraOwner).toBe("kharbranth");
    expect(
      resolvedCityProximityOwner(cameraOwner, "kharbranth"),
    ).toBe("kharbranth");
  });

  it("keeps Kharbranth's complete desktop arrival behind a clear harbor frustum", () => {
    const location = modeledLocations.find(
      (candidate) => candidate.id === "kharbranth",
    )!;
    const arrival = {
      position: location.camera.position,
      target: location.camera.target,
    };
    const oldTightArrival = {
      position: [10.2, 13.5, 31.5] as const,
      target: [10.2, 2.8, 18.4] as const,
    };
    const audit = auditKharbranthCameraFrustum(arrival, location);
    const oldAudit = auditKharbranthCameraFrustum(
      oldTightArrival,
      location,
    );

    expect(audit.earliestVolumeHit?.fraction ?? 1).toBeGreaterThan(0.8);
    expect(
      audit.earliestTerrainHitFraction ?? 1,
    ).toBeGreaterThan(0.8);
    expect(oldAudit.earliestVolumeHit?.fraction ?? 1).toBeLessThan(
      audit.earliestVolumeHit?.fraction ?? 1,
    );
  });

  it("audits authored geometry and runtime occupancy in the Kharbranth camera envelope", () => {
    const location = modeledLocations.find(
      (candidate) => candidate.id === "kharbranth",
    )!;
    const sources = new Set(
      kharbranthCameraExclusionVolumes(location).map(
        (volume) => volume.source,
      ),
    );

    expect(sources).toEqual(
      new Set([
        "authored-cliff",
        "authored-facade",
        "runtime-occupancy",
      ]),
    );
  });

  it("lets incremental Kharbranth zoom-out leave the fixed street entry pose", () => {
    const location = modeledLocations.find(
      (candidate) => candidate.id === "kharbranth",
    )!;
    const street = collisionSafeZoomPose({
      location,
      position: location.camera.position,
      target: location.camera.target,
      factor: 0.38,
      requestedLevel: "street",
    });
    const zoomedOut = collisionSafeZoomPose({
      location,
      position: street.position,
      target: street.target,
      factor: 1.38,
    });

    expect(zoomedOut).not.toEqual(street);
    expect(
      cameraDistance(zoomedOut.position, zoomedOut.target),
    ).toBeGreaterThan(cameraDistance(street.position, street.target));
    expect(
      detailFromDistance(
        cameraDistance(zoomedOut.position, zoomedOut.target),
      ),
    ).toBe("street");
  });
});
