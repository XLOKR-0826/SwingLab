// MediaPipe Pose Landmarker 래퍼 (CDN 동적 로드)
(function (SL) {
  const VER = '0.10.14';
  const LIB = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${VER}/vision_bundle.mjs`;
  const WASM = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${VER}/wasm`;
  const MODELS = {
    lite: 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task',
    full: 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_full/float16/1/pose_landmarker_full.task',
  };
  const cache = {};
  let base = null;
  // tasks-vision 모듈 + wasm 파일셋 (포즈·사진 처리 공용)
  const loadBase = () => base || (base = (async () => {
    const vision = await import(LIB);
    const files = await vision.FilesetResolver.forVisionTasks(WASM);
    return { vision, files };
  })().catch(e => { base = null; throw e; }));
  let ts = 0; // VIDEO 모드는 타임스탬프가 계속 증가해야 함

  SL.pose = {
    // MediaPipe 랜드마크 번호
    L: { nose: 0, lSh: 11, rSh: 12, lEl: 13, rEl: 14, lWr: 15, rWr: 16, lHip: 23, rHip: 24, lKn: 25, rKn: 26, lAn: 27, rAn: 28, lHeel: 29, rHeel: 30, lToe: 31, rToe: 32 },
    EDGES: [[11, 12], [11, 13], [13, 15], [12, 14], [14, 16], [11, 23], [12, 24], [23, 24], [23, 25], [25, 27], [24, 26], [26, 28], [27, 31], [28, 32], [27, 29], [28, 30]],

    async get(kind = 'full') {
      if (cache[kind]) return cache[kind];
      cache[kind] = (async () => {
        const { vision, files } = await loadBase();
        const make = (delegate) => vision.PoseLandmarker.createFromOptions(files, {
          baseOptions: { modelAssetPath: MODELS[kind], delegate },
          runningMode: 'VIDEO', numPoses: 1,
          minPoseDetectionConfidence: 0.5, minPosePresenceConfidence: 0.5, minTrackingConfidence: 0.5,
        });
        try { return await make('GPU'); } catch (e) { console.warn('GPU 실패 → CPU', e); return make('CPU'); }
      })();
      try { return await cache[kind]; } catch (e) { cache[kind] = null; throw e; }
    },

    // 사진용: 사람 영역 마스크까지 출력하는 IMAGE 모드 인스턴스
    async segmenter() {
      if (cache.seg) return cache.seg;
      cache.seg = (async () => {
        const { vision, files } = await loadBase();
        return vision.PoseLandmarker.createFromOptions(files, {
          baseOptions: { modelAssetPath: MODELS.full, delegate: 'CPU' },
          runningMode: 'IMAGE', numPoses: 1, outputSegmentationMasks: true,
          minPoseDetectionConfidence: 0.3, minPosePresenceConfidence: 0.3,
        });
      })();
      try { return await cache.seg; } catch (e) { cache.seg = null; throw e; }
    },

    // 한 프레임 추론 → [[x,y,vis], ...] (정규화 좌표) 또는 null
    detect(lm, source) {
      ts += 34;
      const r = lm.detectForVideo(source, ts);
      const p = r && r.landmarks && r.landmarks[0];
      if (!p) return null;
      return p.map(q => [+q.x.toFixed(4), +q.y.toFixed(4), +(q.visibility ?? 1).toFixed(2)]);
    },
  };
})(window.SL);
