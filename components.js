const PA4_PREFIX = "x1629";

function pa4Log(component, method, details) {
  const id = component.el && component.el.id
    ? `#${component.el.id}`
    : "(no id)";
  const timestamp = new Date().toISOString();

  console.log(
    `[${timestamp}] ${PA4_PREFIX}-motion ${method} ${id}`,
    details || ""
  );
}

AFRAME.registerSystem(`${PA4_PREFIX}-gallery`, {
  init: function () {
    this.exhibits = [];
    this.selected = null;
    this.motionPaused = false;

    this.onKeyDown = this.onKeyDown.bind(this);
    window.addEventListener("keydown", this.onKeyDown);
  },

  register: function (el) {
    if (!this.exhibits.includes(el)) {
      this.exhibits.push(el);
      this.updateStatus();
    }
  },

  unregister: function (el) {
    const index = this.exhibits.indexOf(el);

    if (index !== -1) {
      this.exhibits.splice(index, 1);
    }

    if (this.selected === el) {
      this.selected = null;
    }

    this.updateStatus();
  },

  toggleSelection: function (el) {
    if (this.selected === el) {
      this.selected = null;
      el.components[`${PA4_PREFIX}-exhibit`].setSelected(false);
    } else {
      if (this.selected) {
        const previous = this.selected.components[`${PA4_PREFIX}-exhibit`];
        if (previous) previous.setSelected(false);
      }

      this.selected = el;
      el.components[`${PA4_PREFIX}-exhibit`].setSelected(true);
    }

    this.updateStatus();
  },

  updateStatus: function () {
    const status = document.querySelector("#gallery-status");
    if (!status) return;

    if (!this.selected) {
      status.setAttribute(
        "text",
        "value",
        `Selected: none (0 of ${this.exhibits.length})`
      );
      return;
    }

    const component = this.selected.components[`${PA4_PREFIX}-exhibit`];
    const index = this.exhibits.indexOf(this.selected);
    const name = component ? component.data.name : "Exhibit";

    status.setAttribute(
      "text",
      "value",
      `Selected: ${name} (${index + 1} of ${this.exhibits.length})`
    );
  },

  onKeyDown: function (event) {
    if (event.repeat) return;

    const key = event.key.toLowerCase();

    if (key === "m") {
      this.motionPaused = !this.motionPaused;

      this.exhibits.forEach((el) => {
        const motion = el.components[`${PA4_PREFIX}-motion`];
        if (!motion) return;

        if (this.motionPaused) {
          motion.pause();
        } else {
          motion.play();
        }
      });
    }

    if (key === "x" && this.selected) {
      const selected = this.selected;
      selected.remove();
    }
  },

  remove: function () {
    window.removeEventListener("keydown", this.onKeyDown);
  }
});


AFRAME.registerComponent(`${PA4_PREFIX}-motion`, {
  schema: {
    type: {
      type: "string",
      oneOf: ["bob", "orbit", "pulse"],
      default: "pulse"
    },
    amplitude: {
      type: "number",
      default: 0.12
    },
    period: {
      type: "number",
      default: 2.4
    },
    phase: {
      type: "number",
      default: 0
    }
  },

  init: function () {
    this.basePosition = this.el.object3D.position.clone();
    this.baseScale = this.el.object3D.scale.clone();

    this.elapsed = 0;
    this.phaseOffset = 0;
    this.paused = false;
    this.tickLogged = false;

    pa4Log(this, "init");
  },

  update: function (oldData) {
    const isFirstUpdate = Object.keys(oldData).length === 0;

    if (!isFirstUpdate) {
      this.preserveCurrentPose();
    }

    pa4Log(this, "update", {
      firstCall: isFirstUpdate,
      oldData: oldData,
      newData: this.data
    });
  },

  preserveCurrentPose: function () {
    if (this.data.type !== "pulse" || this.data.amplitude <= 0) return;

    const currentScale = this.el.object3D.scale;
    const currentFactor =
      (currentScale.x / this.baseScale.x +
       currentScale.y / this.baseScale.y +
       currentScale.z / this.baseScale.z) / 3;

    const sineValue = Math.max(
      -1,
      Math.min(1, (currentFactor - 1) / this.data.amplitude)
    );

    const angle = Math.asin(sineValue);
    const period = Math.max(0.01, this.data.period);
    const currentPhase = this.data.phase +
      (Math.PI * 2 * this.elapsed) / period;

    this.phaseOffset = angle - currentPhase;
  },

  tick: function (time, timeDelta) {
    if (!this.tickLogged) {
      pa4Log(this, "tick", { time: time, timeDelta: timeDelta });
      this.tickLogged = true;
    }

    if (this.paused) return;

    this.elapsed += Math.max(0, timeDelta) / 1000;

    const amplitude = this.data.amplitude;
    const period = Math.max(0.01, this.data.period);
    const angle =
      this.data.phase +
      this.phaseOffset +
      (Math.PI * 2 * this.elapsed) / period;

    if (this.data.type === "pulse") {
      const factor = 1 + amplitude * Math.sin(angle);

      this.el.object3D.scale.set(
        this.baseScale.x * factor,
        this.baseScale.y * factor,
        this.baseScale.z * factor
      );
    } else if (this.data.type === "bob") {
      this.el.object3D.position.set(
        this.basePosition.x,
        this.basePosition.y + amplitude * Math.sin(angle),
        this.basePosition.z
      );
    } else if (this.data.type === "orbit") {
      this.el.object3D.position.set(
        this.basePosition.x + amplitude * Math.cos(angle),
        this.basePosition.y,
        this.basePosition.z + amplitude * Math.sin(angle)
      );
    }
  },

  pause: function () {
    this.paused = true;
    pa4Log(this, "pause");
  },

  play: function () {
    this.paused = false;
    pa4Log(this, "play");
  },

  remove: function () {
    this.el.object3D.position.copy(this.basePosition);
    this.el.object3D.scale.copy(this.baseScale);
    pa4Log(this, "remove");
  }
});


AFRAME.registerComponent(`${PA4_PREFIX}-texture`, {
  schema: {
    src: {
      type: "map"
    },
    repeat: {
      type: "vec2",
      default: { x: 1, y: 1 }
    },
    normalSrc: {
      type: "map",
      default: ""
    },
    anisotropy: {
      type: "number",
      default: 8
    }
  },

  init: function () {
    this.mesh = null;
    this.originalMaterial = null;
    this.customMaterial = null;
    this.texture = null;
    this.normalTexture = null;
    this.loadVersion = 0;

    this.onObject3DSet = this.onObject3DSet.bind(this);
    this.el.addEventListener("object3dset", this.onObject3DSet);

    this.findMesh();
  },

  update: function (oldData) {
    const firstUpdate = Object.keys(oldData).length === 0;
    const sourceChanged = firstUpdate || oldData.src !== this.data.src;
    const normalChanged = firstUpdate || oldData.normalSrc !== this.data.normalSrc;

    this.findMesh();

    if (sourceChanged && this.data.src) {
      this.loadMainTexture();
    }

    if (normalChanged && this.data.normalSrc) {
      this.loadNormalTexture();
    }

    this.applyTextureSettings();
    this.applyMaterial();
  },

  onObject3DSet: function () {
    this.findMesh();
    this.applyMaterial();
  },

  findMesh: function () {
    const mesh = this.el.getObject3D("mesh");
    if (!mesh) return;

    if (this.mesh !== mesh) {
      this.mesh = mesh;
      this.originalMaterial = mesh.material;
      this.customMaterial = this.cloneMaterial(this.originalMaterial);
    }
  },

  cloneMaterial: function (material) {
    if (Array.isArray(material)) {
      return material.map((item) => item.clone());
    }

    return material ? material.clone() : new THREE.MeshStandardMaterial();
  },

  resolveImage: function (source) {
    if (!source) return null;

    if (source instanceof HTMLImageElement) {
      return source;
    }

    if (typeof source === "string" && source.startsWith("#")) {
      return document.querySelector(source);
    }

    if (source.tagName === "IMG") {
      return source;
    }

    return null;
  },

  makeTexture: function (source, callback) {
    const image = this.resolveImage(source);

    if (image) {
      const texture = new THREE.Texture(image);

      if (image.complete) {
        texture.needsUpdate = true;
        callback(texture);
      } else {
        image.addEventListener("load", function () {
          texture.needsUpdate = true;
          callback(texture);
        }, { once: true });
      }

      return texture;
    }

    const url = typeof source === "string" ? source : "";
    if (!url) return null;

    const loader = new THREE.TextureLoader();
    return loader.load(url, callback);
  },

  loadMainTexture: function () {
    const version = ++this.loadVersion;

    if (this.texture) this.texture.dispose();

    this.texture = this.makeTexture(this.data.src, (texture) => {
      if (version !== this.loadVersion) {
        texture.dispose();
        return;
      }

      this.texture = texture;
      this.applyTextureSettings();
      this.applyMaterial();
    });
  },

  loadNormalTexture: function () {
    if (this.normalTexture) this.normalTexture.dispose();

    this.normalTexture = this.makeTexture(this.data.normalSrc, (texture) => {
      this.normalTexture = texture;
      this.applyTextureSettings();
      this.applyMaterial();
    });
  },

  applyTextureSettings: function () {
    const repeat = this.data.repeat;
    const renderer = this.el.sceneEl && this.el.sceneEl.renderer;
    const maxAnisotropy =
      renderer && renderer.capabilities &&
      renderer.capabilities.getMaxAnisotropy
        ? renderer.capabilities.getMaxAnisotropy()
        : 1;

    [this.texture, this.normalTexture].forEach((texture) => {
      if (!texture) return;

      texture.wrapS = THREE.RepeatWrapping;
      texture.wrapT = THREE.RepeatWrapping;
      texture.repeat.set(repeat.x, repeat.y);
      texture.generateMipmaps = true;
      texture.minFilter = THREE.LinearMipmapLinearFilter;
      texture.magFilter = THREE.LinearFilter;
      texture.anisotropy = Math.min(
        maxAnisotropy,
        Math.max(1, this.data.anisotropy)
      );
      texture.needsUpdate = true;
    });
  },

  applyMaterial: function () {
    if (!this.mesh || !this.customMaterial) return;

    const materials = Array.isArray(this.customMaterial)
      ? this.customMaterial
      : [this.customMaterial];

    materials.forEach((material) => {
      if (this.texture) material.map = this.texture;

      if (this.normalTexture && "normalMap" in material) {
        material.normalMap = this.normalTexture;
      }

      material.needsUpdate = true;
    });

    this.mesh.material = this.customMaterial;
  },

  remove: function () {
    this.el.removeEventListener("object3dset", this.onObject3DSet);

    if (this.mesh && this.originalMaterial) {
      this.mesh.material = this.originalMaterial;
    }

    if (this.texture) this.texture.dispose();
    if (this.normalTexture) this.normalTexture.dispose();

    if (Array.isArray(this.customMaterial)) {
      this.customMaterial.forEach((material) => material.dispose());
    } else if (this.customMaterial) {
      this.customMaterial.dispose();
    }
  }
});


AFRAME.registerComponent(`${PA4_PREFIX}-exhibit`, {
  schema: {
    name: {
      type: "string",
      default: "Exhibit"
    },
    info: {
      type: "string",
      default: ""
    }
  },

  init: function () {
    this.gallery = this.el.sceneEl.systems[`${PA4_PREFIX}-gallery`];
    this.selected = false;
    this.originalColors = [];

    this.label = document.createElement("a-text");
    this.label.setAttribute("value", "");
    this.label.setAttribute("align", "center");
    this.label.setAttribute("color", "#FFFFFF");
    this.label.setAttribute("width", "3");
    this.label.setAttribute("visible", false);
    this.label.setAttribute("position", "0 1 0");
    this.el.appendChild(this.label);

    this.gallery.register(this.el);
  },

  events: {
    mouseenter: function () {
      this.setHighlight(true);
    },

    mouseleave: function () {
      this.setHighlight(false);
    },

    click: function () {
      this.gallery.toggleSelection(this.el);
    }
  },

  setHighlight: function (enabled) {
    const mesh = this.el.getObject3D("mesh");
    if (!mesh) return;

    const materials = Array.isArray(mesh.material)
      ? mesh.material
      : [mesh.material];

    if (enabled) {
      this.originalColors = materials.map((material) => (
        material.color ? material.color.clone() : null
      ));

      materials.forEach((material) => {
        if (material.color) material.color.set("#FFFFFF");
        if ("emissive" in material) material.emissive.set("#174A68");
      });
    } else {
      materials.forEach((material, index) => {
        if (material.color && this.originalColors[index]) {
          material.color.copy(this.originalColors[index]);
        }
        if ("emissive" in material) material.emissive.set("#000000");
      });
    }
  },

  setSelected: function (selected) {
    this.selected = selected;

    this.label.setAttribute("visible", selected);
    this.label.setAttribute(
      "value",
      selected ? `${this.data.name}\n${this.data.info}` : ""
    );

    const motion = this.el.components[`${PA4_PREFIX}-motion`];
    if (motion) {
      const baseAmplitude = 0.12;
      const newAmplitude = selected
        ? baseAmplitude * 2
        : baseAmplitude;

      this.el.setAttribute(
        `${PA4_PREFIX}-motion`,
        "amplitude",
        newAmplitude
      );
    }
  },

  remove: function () {
    if (this.gallery) {
      this.gallery.unregister(this.el);
    }

    if (this.label && this.label.parentNode) {
      this.label.parentNode.removeChild(this.label);
    }
  }
});