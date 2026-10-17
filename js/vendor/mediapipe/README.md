# MediaPipe Tasks Vision (pose landmarker)

Usato da `js/postura.js` per trovare i punti del corpo nelle foto, direttamente sul telefono (nessun invio di immagini).

- `vision_bundle.mjs` e `wasm/`: pacchetto npm `@mediapipe/tasks-vision` 0.10.14 (Google, licenza Apache 2.0).
- `pose_landmarker_lite.task`: modello "Pose Landmarker (lite)" di MediaPipe (Apache 2.0),
  da https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task

Licenza: https://github.com/google-ai-edge/mediapipe/blob/master/LICENSE
