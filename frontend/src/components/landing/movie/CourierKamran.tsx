// src/components/landing/movie/CourierKamran.tsx
// 3D Realistic Human Rig & Shader implementation of Courier Kamran.
// Features multi-stop subsurface skin shading, articulated joints, cloth folds,
// deep-set facial anatomy with catchlights, open-face helmet, and 3D depth limbs.

import React, { forwardRef } from 'react';

export interface CourierKamranProps extends React.SVGProps<SVGGElement> {
  /**
   * Vertical riding vibration offset in pixels.
   */
  vibrationY?: number;
  /**
   * Whether to render the strapped Rs. 4,500 COD parcel box on the rear rack.
   */
  showParcel?: boolean;
  /**
   * Forward riding lean angle in degrees (default 14°).
   */
  leanAngle?: number;
  /**
   * Cervical head & gaze pitch tilt in degrees (default -4°).
   */
  headTilt?: number;
  /**
   * Whether the polycarbonate visor is flipped down over the eyes.
   */
  visorDown?: boolean;
  /**
   * Which limb layer to render: 'far' for limbs behind the motorcycle,
   * 'near' for rider in front of the motorcycle, or 'both' (default).
   */
  layer?: 'far' | 'near' | 'both';
}

/**
 * 3D Realistic Anatomical Courier Kamran Component.
 * - Subsurface scattering warm skin radial gradient (f3c6a5 -> dc9e76 -> b57049 -> 7c4224 -> 9a5834)
 * - Deep-set eye socket with sclera, dark brown iris, pupil, lifelike specular catchlight & eyelids
 * - Sculpted facial profile: cranium, nasal bridge, nasolabial crease, stubble & groomed mustache
 * - Articulated quadriceps, knee articulation creases, gastrocnemius calf & 3D leather boots
 * - Far-side limbs (Far Left Leg & Far Left Arm) providing true 3D spatial depth
 * - PBR multi-stop Rasai emerald jacket shaders with lumbar cloth folds and hi-vis 3M safety sash
 * - Fixed 3D mirrored iridium helmet visor (helmet ka mirror) reflecting Lahore dawn sky & sun
 */
export const CourierKamran = forwardRef<SVGGElement, CourierKamranProps>(
  (
    {
      vibrationY = 0,
      showParcel = true,
      leanAngle = 14,
      headTilt = -4,
      visorDown = true,
      layer = 'both',
      transform,
      ...restProps
    },
    ref
  ) => {
    return (
      <g
        ref={ref}
        id="courier-kamran"
        transform={
          vibrationY !== 0
            ? `${transform || ''} translate(0, ${vibrationY.toFixed(2)})`.trim()
            : transform
        }
        {...restProps}
      >
        <defs>
          {/* Subtle Periodic Character Eye Blink Physics */}
          <style>{`
            @keyframes kamranEyeBlink {
              0%, 93%, 100% {
                transform: scaleY(1);
              }
              95.5%, 97% {
                transform: scaleY(0.08);
              }
            }
            .animate-eye-blink {
              animation: kamranEyeBlink 3.8s ease-in-out infinite;
            }

            @keyframes kamranWindFlutter {
              0%, 100% {
                transform: translate(0px, 0px) rotate(0deg);
              }
              25% {
                transform: translate(0.6px, -0.4px) rotate(0.8deg);
              }
              50% {
                transform: translate(-0.4px, 0.5px) rotate(-0.6deg);
              }
              75% {
                transform: translate(0.5px, 0.2px) rotate(0.5deg);
              }
            }
            .animate-wind-flutter {
              animation: kamranWindFlutter 0.35s ease-in-out infinite;
              transform-origin: center;
            }

            @keyframes kamranBreathing {
              0%, 100% {
                transform: scale(1);
              }
              50% {
                transform: scale(1.008);
              }
            }
            .animate-kamran-breathing {
              animation: kamranBreathing 2.6s ease-in-out infinite;
              transform-origin: 400px 250px;
            }
          `}</style>

          {/* ================= 3D SKIN & FACE SHADERS ================= */}
          <radialGradient id="skinHead3D" cx="62%" cy="38%" r="58%" fx="68%" fy="32%">
            <stop offset="0%" stopColor="#f3c6a5" />
            <stop offset="35%" stopColor="#dc9e76" />
            <stop offset="72%" stopColor="#b57049" />
            <stop offset="92%" stopColor="#7c4224" />
            <stop offset="100%" stopColor="#9a5834" />
          </radialGradient>

          <linearGradient id="skinNeck3D" x1="0%" y1="0%" x2="100%" y2="20%">
            <stop offset="0%" stopColor="#6e381d" />
            <stop offset="45%" stopColor="#b06c47" />
            <stop offset="80%" stopColor="#d99b72" />
            <stop offset="100%" stopColor="#8c4c29" />
          </linearGradient>

          <radialGradient id="cheekFlush" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#e11d48" stopOpacity="0.28" />
            <stop offset="100%" stopColor="#e11d48" stopOpacity="0" />
          </radialGradient>

          <linearGradient id="beardStubble" x1="20%" y1="0%" x2="80%" y2="100%">
            <stop offset="0%" stopColor="#1f1612" stopOpacity="0.15" />
            <stop offset="50%" stopColor="#1f1612" stopOpacity="0.55" />
            <stop offset="100%" stopColor="#0f0a08" stopOpacity="0.75" />
          </linearGradient>

          {/* ================= 3D HELMET & VISOR SHADERS ================= */}
          <radialGradient id="helmetShell3D" cx="38%" cy="28%" r="68%" fx="32%" fy="22%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="28%" stopColor="#f1f5f9" />
            <stop offset="65%" stopColor="#cbd5e1" />
            <stop offset="88%" stopColor="#64748b" />
            <stop offset="100%" stopColor="#334155" />
          </radialGradient>

          <linearGradient id="helmetPadding" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#334155" />
            <stop offset="50%" stopColor="#0f172a" />
            <stop offset="100%" stopColor="#020617" />
          </linearGradient>

          <linearGradient id="visorGlass3D" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#bae6fd" stopOpacity="0.65" />
            <stop offset="35%" stopColor="#38bdf8" stopOpacity="0.28" />
            <stop offset="55%" stopColor="#ffffff" stopOpacity="0.75" />
            <stop offset="85%" stopColor="#0284c7" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#0f172a" stopOpacity="0.7" />
          </linearGradient>

          {/* 3D Mirrored Iridium / Chrome Helmet Visor (Mirror of Helmet) */}
          <linearGradient id="helmetMirrorVisor" x1="0%" y1="0%" x2="100%" y2="80%">
            <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.8" />
            <stop offset="25%" stopColor="#bae6fd" stopOpacity="0.9" />
            <stop offset="45%" stopColor="#ffffff" stopOpacity="0.98" />
            <stop offset="68%" stopColor="#f59e0b" stopOpacity="0.82" />
            <stop offset="86%" stopColor="#ea580c" stopOpacity="0.68" />
            <stop offset="100%" stopColor="#0f172a" stopOpacity="0.88" />
          </linearGradient>

          <linearGradient id="visorSpecularStreak" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
            <stop offset="35%" stopColor="#ffffff" stopOpacity="0.75" />
            <stop offset="70%" stopColor="#bae6fd" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
          </linearGradient>

          {/* ================= 3D JACKET & CLOTHING SHADERS ================= */}
          <linearGradient id="jacketTorso3D" x1="0%" y1="15%" x2="100%" y2="35%">
            <stop offset="0%" stopColor="#022c22" />
            <stop offset="22%" stopColor="#065f46" />
            <stop offset="68%" stopColor="#10b981" />
            <stop offset="92%" stopColor="#6ee7b7" />
            <stop offset="100%" stopColor="#fde047" />
          </linearGradient>

          <linearGradient id="jacketSleeve3D" x1="15%" y1="0%" x2="85%" y2="100%">
            <stop offset="0%" stopColor="#6ee7b7" />
            <stop offset="35%" stopColor="#10b981" />
            <stop offset="78%" stopColor="#065f46" />
            <stop offset="100%" stopColor="#022c22" />
          </linearGradient>

          <linearGradient id="jacketFarArm" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#065f46" />
            <stop offset="100%" stopColor="#020617" />
          </linearGradient>

          <linearGradient id="hiVisStripe" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ecfccb" />
            <stop offset="50%" stopColor="#84cc16" />
            <stop offset="100%" stopColor="#3f6212" />
          </linearGradient>

          {/* ================= 3D CARGO PANTS & BOOTS SHADERS ================= */}
          <linearGradient id="pantsThigh3D" x1="25%" y1="0%" x2="75%" y2="100%">
            <stop offset="0%" stopColor="#e6cba5" />
            <stop offset="30%" stopColor="#c69f70" />
            <stop offset="72%" stopColor="#946f43" />
            <stop offset="100%" stopColor="#4f371c" />
          </linearGradient>

          <linearGradient id="pantsCalf3D" x1="0%" y1="20%" x2="100%" y2="45%">
            <stop offset="0%" stopColor="#4f371c" />
            <stop offset="35%" stopColor="#946f43" />
            <stop offset="78%" stopColor="#c69f70" />
            <stop offset="95%" stopColor="#e6cba5" />
            <stop offset="100%" stopColor="#fde047" />
          </linearGradient>

          <linearGradient id="pantsFarLeg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#694c29" />
            <stop offset="100%" stopColor="#291c0c" />
          </linearGradient>

          <radialGradient id="leatherBoot3D" cx="65%" cy="30%" r="70%">
            <stop offset="0%" stopColor="#64748b" />
            <stop offset="25%" stopColor="#334155" />
            <stop offset="70%" stopColor="#0f172a" />
            <stop offset="100%" stopColor="#020617" />
          </radialGradient>

          {/* Soft Occlusion Drop Shadow */}
          <filter id="softOcclusion" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="4" stdDeviation="4" floodColor="#000000" floodOpacity="0.45" />
          </filter>
        </defs>

        {/* Calibrated transform to seat seamlessly on the Honda CD 70 in Scene 2 */}
        <g id="RealisticHumanRiderContainer" transform="translate(780, 800) scale(0.947368) translate(-235, -442)">
          {/* ===============================================================
              LAYER 1: BACK / FAR SIDE HUMAN LIMBS (Creates 3D Depth)
             =============================================================== */}
          {(layer === 'both' || layer === 'far') && (
            <g id="FarSideHumanLimbs" opacity="0.92">
              {/* Far Leg (Left Leg tucked behind fuel tank) */}
              <path
                d="M 358 326 C 392 332, 434 362, 444 388 C 450 402, 430 412, 412 400 C 382 380, 355 360, 345 344 Z"
                fill="url(#pantsFarLeg)"
              />
              {/* Far Calf */}
              <path
                d="M 436 392 C 442 422, 422 458, 410 478 L 386 474 C 396 446, 408 415, 416 390 Z"
                fill="url(#pantsFarLeg)"
              />
              {/* Far Arm reaching to Left Handlebar Clutch Grip */}
              <path
                d="M 442 204 C 468 228, 492 260, 522 276 L 514 290 C 482 276, 452 248, 428 222 Z"
                fill="url(#jacketFarArm)"
              />
            </g>
          )}

          {/* ===============================================================
              LAYER 2: 3D ANATOMICAL HUMAN RIDER (FOREGROUND)
             =============================================================== */}
          {(layer === 'both' || layer === 'near') && (
            <g id="RealisticHumanRider" filter="url(#softOcclusion)">
            {/* -------------------------------------------------------------
                LOWER BODY: SEATED PELVIS, MUSCULAR THIGH, KNEE & BOOT
               ------------------------------------------------------------- */}
            <g id="HumanRightLeg">
              {/* Seated Pelvis & Muscular Thigh (Natural taper from hip to knee) */}
              <path
                d="M 350 322
                   C 378 318, 435 344, 466 374
                   C 476 383, 475 398, 462 405
                   C 446 412, 412 388, 376 372
                   C 344 358, 336 336, 350 322 Z"
                fill="url(#pantsThigh3D)"
                stroke="#3d2914"
                strokeWidth="1.2"
              />

              {/* 3D Cloth Wrinkles at Hip Joint */}
              <path
                d="M 366 335 Q 388 345 395 360 M 378 330 Q 402 340 412 355"
                fill="none"
                stroke="#4f371c"
                strokeWidth="2"
                strokeLinecap="round"
                opacity="0.55"
              />

              {/* Cargo Pocket with 3D Flap & Bevel */}
              <g transform="translate(405, 348) rotate(26)">
                <rect
                  x="0"
                  y="0"
                  width="36"
                  height="26"
                  rx="3"
                  fill="url(#pantsThigh3D)"
                  stroke="#4f371c"
                  strokeWidth="1.5"
                />
                <path
                  d="M -1 0 L 37 0 L 34 9 L 18 12 L 2 9 Z"
                  fill="#d5b28a"
                  stroke="#4f371c"
                  strokeWidth="1.2"
                />
                <circle cx="18" cy="8" r="2" fill="#4f371c" />
              </g>

              {/* Articulated Knee Cap & gastrocnemius Calf Muscle */}
              <path
                d="M 442 384
                   C 458 378, 474 388, 469 406
                   C 458 442, 434 468, 424 494
                   L 394 488
                   C 402 458, 412 436, 434 398
                   C 436 391, 438 386, 442 384 Z"
                fill="url(#pantsCalf3D)"
                stroke="#3d2914"
                strokeWidth="1.2"
              />

              {/* Knee Joint Articulation Creases */}
              <path
                d="M 446 392 Q 460 396 466 404 M 440 400 Q 454 404 461 412"
                fill="none"
                stroke="#4f371c"
                strokeWidth="1.8"
                strokeLinecap="round"
                opacity="0.65"
              />

              {/* 3D Sculpted Motorcycle Ankle Boot */}
              <g id="RiderBoot" transform="translate(384, 480)">
                {/* Ankle Cuff */}
                <path
                  d="M 10 0 L 38 4 L 42 18 L 6 16 Z"
                  fill="#1e293b"
                  stroke="#020617"
                  strokeWidth="1.5"
                />
                {/* Main Leather Boot Body with Toe Box */}
                <path
                  d="M 6 12
                     C 6 12, 34 12, 44 16
                     C 56 20, 68 23, 72 30
                     C 74 35, 70 39, 62 39
                     L 4 39
                     C 0 39, -2 32, 2 22 Z"
                  fill="url(#leatherBoot3D)"
                  stroke="#020617"
                  strokeWidth="1.5"
                />
                {/* Specular Toe Highlight */}
                <path
                  d="M 42 20 C 52 22, 62 25, 66 30"
                  fill="none"
                  stroke="#94a3b8"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  opacity="0.5"
                />
                {/* Rugged Rubber Sole & Heel Step */}
                <path
                  d="M 0 36 L 22 36 L 22 41 L 0 41 Z M 28 37 L 70 37 L 70 41 L 28 41 Z"
                  fill="#09090b"
                />
                {/* Footpeg Rest planted on peg */}
                <circle cx="28" cy="39" r="5" fill="#475569" stroke="#0f172a" strokeWidth="2" />
              </g>
            </g>

            {/* -------------------------------------------------------------
                UPPER BODY: PIVOTING TORSO, HEAD & ARMS (Forward Lean)
               ------------------------------------------------------------- */}
            <g
              id="UpperBodyPivot"
              transform={`translate(372, 330) rotate(${leanAngle - 14}) translate(-372, -330)`}
            >
              {/* ANATOMICAL TORSO & RIDER JACKET */}
              <g id="TorsoAndJacket" className="animate-kamran-breathing">
                {/* Main Sculpted Jacket Body (Natural S-Curve Back + Ribcage Chest) */}
                <path
                  d="M 342 325
                     C 348 272, 366 222, 396 176
                     C 406 162, 428 160, 442 170
                     C 464 188, 474 222, 462 258
                     C 450 294, 434 318, 424 338
                     C 396 342, 362 336, 342 325 Z"
                  fill="url(#jacketTorso3D)"
                  stroke="#022c22"
                  strokeWidth="1.5"
                />

                {/* Dark Breathable Mesh Side Panel */}
                <path
                  d="M 388 332 C 398 292, 418 250, 442 214 L 456 246 C 442 282, 428 312, 418 336 Z"
                  fill="#022c22"
                  opacity="0.65"
                />

                {/* High-Collar Neck Guard */}
                <path
                  d="M 402 174 L 434 156 L 452 176 L 436 188 Z"
                  fill="url(#jacketTorso3D)"
                  stroke="#022c22"
                  strokeWidth="1.5"
                />

                {/* Realistic 3D Cloth Folds & Lumbar Creases */}
                <path
                  d="M 362 288 Q 392 294 415 282
                     M 372 254 Q 404 262 426 248
                     M 354 312 Q 385 320 412 310"
                  fill="none"
                  stroke="#022c22"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  opacity="0.45"
                />
                <path
                  d="M 364 285 Q 392 291 415 279
                     M 374 251 Q 404 259 426 245"
                  fill="none"
                  stroke="#6ee7b7"
                  strokeWidth="1.2"
                  strokeLinecap="round"
                  opacity="0.35"
                />

                {/* Reflective Hi-Vis Safety Sash & Waist Trim */}
                <path
                  d="M 396 182 C 418 218, 436 258, 452 298"
                  fill="none"
                  stroke="url(#hiVisStripe)"
                  strokeWidth="7"
                  strokeLinecap="round"
                />
                <path
                  d="M 346 322 C 372 328, 404 330, 426 326"
                  fill="none"
                  stroke="url(#hiVisStripe)"
                  strokeWidth="6"
                  strokeLinecap="round"
                />
              </g>

              {/* -----------------------------------------------------------
                  SCULPTED 3D HUMAN NECK, HEAD, FACE & HELMET
                 ----------------------------------------------------------- */}
              <g
                id="HumanHeadGroup"
                transform={`translate(425, 165) rotate(${headTilt}) translate(-425, -165)`}
              >
                {/* Muscular Cylindrical Neck with Sternocleidomastoid Shading */}
                <path
                  d="M 406 172 L 414 138 L 444 144 L 438 178 Z"
                  fill="url(#skinNeck3D)"
                />
                {/* Sub-chin Cast Shadow on Neck */}
                <path
                  d="M 412 142 C 424 152, 436 154, 444 148 L 442 160 C 430 162, 418 158, 410 150 Z"
                  fill="#431e0d"
                  opacity="0.55"
                />

                {/* ANATOMICAL HUMAN HEAD & FACIAL PROFILE */}
                <g id="SculptedHumanFace">
                  {/* Cranium + Brow Ridge + Nose + Lips + Jawline */}
                  <path
                    d="M 392 105
                       C 392 74, 420 62, 444 74
                       C 456 80, 462 92, 460 102
                       C 459 106, 461 109, 467 117
                       C 470 121, 468 125, 462 125
                       C 464 128, 465 131, 462 134
                       C 464 136, 463 140, 459 141
                       C 461 146, 458 153, 450 155
                       C 436 157, 418 150, 408 140
                       C 396 130, 392 118, 392 105 Z"
                    fill="url(#skinHead3D)"
                    stroke="#6e381d"
                    strokeWidth="0.9"
                  />

                  {/* Subsurface Cheek Warmth */}
                  <circle cx="446" cy="124" r="14" fill="url(#cheekFlush)" />

                  {/* Realistic Nose Nostril & Nasolabial Crease */}
                  <path
                    d="M 457 123 C 460 122, 463 123, 464 125"
                    fill="none"
                    stroke="#592b15"
                    strokeWidth="1.4"
                    strokeLinecap="round"
                  />
                  <path
                    d="M 452 120 Q 446 128 448 136"
                    fill="none"
                    stroke="#8c4c29"
                    strokeWidth="1"
                    strokeLinecap="round"
                    opacity="0.6"
                  />

                  {/* Realistic Stubble & Groomed Mustache */}
                  <path
                    d="M 424 122
                       C 430 122, 434 134, 444 134
                       C 452 134, 458 128, 462 128
                       C 464 134, 461 153, 450 155
                       C 435 157, 420 148, 416 138 Z"
                    fill="url(#beardStubble)"
                  />
                  {/* Mustache Detail */}
                  <path
                    d="M 450 131 C 455 128, 462 129, 465 133 C 460 135, 453 135, 448 133 Z"
                    fill="#1c1411"
                  />
                  {/* Lower Lip Highlight */}
                  <path
                    d="M 454 137 C 458 137, 461 137, 462 136"
                    fill="none"
                    stroke="#e6a98a"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                  />

                  {/* Deep-Set Eye Socket, Sclera, Iris, Catchlight & Eyebrow */}
                  <g id="RealisticEye" className="animate-eye-blink" style={{ transformOrigin: '454px 107px' }}>
                    {/* Eye Socket Shadow */}
                    <ellipse cx="452" cy="107" rx="7" ry="4.5" fill="#7c4224" opacity="0.55" />
                    {/* White Sclera */}
                    <path
                      d="M 446 107 Q 452 103 457 107 Q 452 110 446 107 Z"
                      fill="#f8fafc"
                    />
                    {/* Dark Brown Iris & Pupil */}
                    <circle cx="453.5" cy="107" r="2.4" fill="#291509" />
                    <circle cx="454" cy="107" r="1.2" fill="#000000" />
                    {/* Lifelike Eye Catchlight */}
                    <circle cx="454.8" cy="106" r="0.8" fill="#ffffff" />
                    {/* Upper Eyelid Crease */}
                    <path
                      d="M 445 106 Q 452 102 458 106"
                      fill="none"
                      stroke="#271206"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                    />
                    {/* Expressive Eyebrow */}
                    <path
                      d="M 443 101 Q 453 97 460 101"
                      fill="none"
                      stroke="#181210"
                      strokeWidth="2.6"
                      strokeLinecap="round"
                    />
                  </g>

                  {/* Sculpted Human Ear with Helix & Tragus */}
                  <g id="HumanEar" transform="translate(412, 108)">
                    <ellipse cx="4" cy="10" rx="6.5" ry="10.5" fill="url(#skinHead3D)" stroke="#7c4224" strokeWidth="1" />
                    <path
                      d="M 3 4 C 7 4, 8 10, 5 15 C 3 17, 1 15, 2 12"
                      fill="none"
                      stroke="#7c4224"
                      strokeWidth="1.4"
                      strokeLinecap="round"
                    />
                  </g>
                </g>

                {/* 3D OPEN-FACE HELMET & ARTICULATED VISOR */}
                <g id="RiderHelmet3D">
                  {/* Inner Foam EPS Liner */}
                  <path
                    d="M 382 116 C 376 74, 412 50, 452 64 C 464 68, 472 78, 475 88 L 462 96 C 454 84, 434 84, 424 98 L 418 136 L 396 138 Z"
                    fill="url(#helmetPadding)"
                  />

                  {/* Glossy 3D Outer Helmet Shell */}
                  <path
                    d="M 380 112
                       C 374 68, 412 46, 454 60
                       C 468 65, 476 76, 478 86
                       C 462 84, 444 88, 432 98
                       C 428 102, 426 116, 428 132
                       C 429 140, 422 146, 412 144
                       C 394 140, 383 128, 380 112 Z"
                    fill="url(#helmetShell3D)"
                    stroke="#475569"
                    strokeWidth="1.2"
                  />

                  {/* Aerodynamic Green Racing Stripes on Helmet */}
                  <path
                    d="M 388 94 C 406 74, 438 68, 468 76 L 472 82 C 442 76, 410 82, 392 102 Z"
                    fill="#065f46"
                  />
                  <path
                    d="M 394 106 C 410 90, 438 84, 462 88"
                    fill="none"
                    stroke="#10b981"
                    strokeWidth="3"
                    strokeLinecap="round"
                  />

                  {/* Chin Strap & Quick-Release Buckle */}
                  <path
                    d="M 418 138 L 434 156 L 444 156 L 424 134 Z"
                    fill="#1e293b"
                  />
                  <rect x="428" y="148" width="8" height="6" rx="1" fill="#dc2626" />

                  {/* ========================================================= */}
                  {/* FIXED 3D MIRRORED HELMET VISOR (HELMET KA MIRROR)         */}
                  {/* ========================================================= */}
                  {/* 1. Pivoting Aerodynamic Mirrored Face Shield */}
                  <g
                    id="RiderMirrorVisor"
                    transform={
                      visorDown
                        ? undefined
                        : 'rotate(-30 430 102)'
                    }
                  >
                    {/* Mirrored Iridium Optical Shield (Covers brow down to nose bridge) */}
                    <path
                      d="M 430 96
                         C 446 76, 470 78, 482 92
                         C 490 102, 492 118, 484 128
                         C 472 134, 452 128, 436 114
                         L 430 102 Z"
                      fill="url(#helmetMirrorVisor)"
                      stroke="url(#chromeMetal)"
                      strokeWidth="1.2"
                    />

                    {/* Razor-Sharp Sunlight Glint & Specular Reflection Flare */}
                    <path
                      d="M 444 88 C 462 88, 474 98, 478 114"
                      fill="none"
                      stroke="url(#visorSpecularStreak)"
                      strokeWidth="3.2"
                      strokeLinecap="round"
                    />
                    <path
                      d="M 448 86 C 466 86, 477 96, 480 110"
                      fill="none"
                      stroke="#ffffff"
                      strokeWidth="1.2"
                      strokeLinecap="round"
                      opacity="0.95"
                    />

                    {/* Lower Aerodynamic Wind Deflector Lip */}
                    <path
                      d="M 436 114 C 452 126, 472 130, 484 126"
                      fill="none"
                      stroke="#ffffff"
                      strokeWidth="0.8"
                      opacity="0.65"
                    />
                  </g>

                  {/* 2. Solid Mechanical Ratchet Temple Hinge (Fixed to Helmet Shell) */}
                  <g id="HelmetTempleHinge" transform="translate(430, 102)">
                    {/* Matte Graphite Base Mounting Disc */}
                    <circle cx="0" cy="0" r="7.5" fill="#1e293b" stroke="#475569" strokeWidth="1.2" />
                    {/* 3 High-Tensile Allen Fasteners */}
                    <circle cx="0" cy="-4.5" r="0.9" fill="#cbd5e1" stroke="#334155" strokeWidth="0.4" />
                    <circle cx="-4" cy="2.5" r="0.9" fill="#cbd5e1" stroke="#334155" strokeWidth="0.4" />
                    <circle cx="4" cy="2.5" r="0.9" fill="#cbd5e1" stroke="#334155" strokeWidth="0.4" />
                    {/* Knurled Chrome Center Pivot Pin & Screwdriver Slot */}
                    <circle cx="0" cy="0" r="4.2" fill="url(#chromeMetal)" stroke="#090d16" strokeWidth="0.8" />
                    <line x1="-2.2" y1="0" x2="2.2" y2="0" stroke="#090d16" strokeWidth="1" />
                    {/* Red Anodized Quick-Release Detent Lock Tab */}
                    <rect x="-3" y="6" width="6" height="3" rx="0.8" fill="#dc2626" stroke="#991b1b" strokeWidth="0.5" />
                  </g>
                </g>
              </g>

              {/* -----------------------------------------------------------
                  ARTICULATED HUMAN RIGHT ARM, ELBOW, FOREARM & GLOVED HAND
                 ----------------------------------------------------------- */}
              <g id="ArticulatedRightArm">
                {/* Upper Arm (Deltoid Shoulder Cap + Bicep/Tricep Taper) */}
                <path
                  d="M 412 186
                     C 424 176, 446 180, 456 196
                     L 488 244
                     C 492 254, 480 266, 468 260
                     L 422 222
                     C 408 210, 404 194, 412 186 Z"
                  fill="url(#jacketSleeve3D)"
                  stroke="#022c22"
                  strokeWidth="1.4"
                />

                {/* Shoulder Patch Emblem */}
                <polygon
                  points="436,200 448,204 444,216 432,212"
                  fill="#facc15"
                  stroke="#022c22"
                  strokeWidth="1"
                />

                {/* Forearm Sleeve & Articulated Hand */}
                <g id="ForearmAndHand">
                  {/* Forearm Sleeve tapering to Wrist Cuff */}
                  <path
                    d="M 468 242
                       C 476 236, 488 238, 494 246
                       L 534 276
                       L 522 292
                       L 468 262
                       C 462 256, 462 246, 468 242 Z"
                    fill="url(#jacketSleeve3D)"
                    stroke="#022c22"
                    strokeWidth="1.4"
                  />

                  {/* Elbow Wrinkles */}
                  <path
                    d="M 472 246 Q 482 248 486 256 M 478 242 Q 488 244 492 252"
                    fill="none"
                    stroke="#022c22"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    opacity="0.6"
                  />

                  {/* Sculpted Riding Glove with Knuckle Armor & Curled Fingers */}
                  <g id="RidingGlove3D" transform="translate(522, 274)">
                    {/* Wrist Strap */}
                    <rect x="-2" y="2" width="10" height="16" rx="2" fill="#0f172a" transform="rotate(-30)" />
                    {/* Main Hand Dorsum & Knuckle Protector */}
                    <path
                      d="M 4 0 C 14 -2, 24 4, 28 12 C 30 18, 22 24, 12 22 L 0 14 Z"
                      fill="url(#leatherBoot3D)"
                      stroke="#020617"
                      strokeWidth="1.2"
                    />
                    {/* Carbon Knuckle Guard Highlight */}
                    <ellipse cx="14" cy="7" rx="5" ry="3" fill="#475569" />
                    {/* Articulated Fingers wrapped around Throttle Grip */}
                    <circle cx="25" cy="15" r="4" fill="#1e293b" stroke="#020617" strokeWidth="1" />
                    <circle cx="22" cy="19" r="4" fill="#1e293b" stroke="#020617" strokeWidth="1" />
                    <circle cx="18" cy="21" r="3.8" fill="#1e293b" stroke="#020617" strokeWidth="1" />
                    {/* Thumb Grip */}
                    <path
                      d="M 10 14 C 14 18, 20 18, 22 14"
                      fill="none"
                      stroke="#334155"
                      strokeWidth="3.5"
                      strokeLinecap="round"
                    />
                  </g>
                </g>
              </g>
            </g>
          </g>
        )}
      </g>
    </g>
  );
  }
);

CourierKamran.displayName = 'CourierKamran';

export default CourierKamran;
