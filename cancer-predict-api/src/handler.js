require("dotenv").config();
const tf = require("@tensorflow/tfjs-node");
const uuid = require("uuid");
const Firestore = require("@google-cloud/firestore");

const firestore = new Firestore();

let model;

async function loadModel() {
  const modelUrl = "https://storage.googleapis.com/teak-spot-442407-c4/predict-model/model.json";
  model = await tf.loadGraphModel(modelUrl);
}

loadModel();

const isGrayscale = (tensor) => {
  const [width, height, channels] = tensor.shape;
  if (channels !== 3) return false;
  const [r, g, b] = tf.split(tensor, 3, 2);
  return tf.all(tf.equal(r, g)).arraySync() && tf.all(tf.equal(g, b)).arraySync();
};

const getpredictCancer = async (request, h) => {
  const { payload } = request;
  const file = payload.image;

  if (!file) {
    return h
      .response({
        status: "fail",
        message: "No file uploaded",
      })
      .code(400);
  }

  try {
    // Read the file buffer
    const imageBuffer = await new Promise((resolve, reject) => {
      const bufs = [];
      file.on("data", (chunk) => bufs.push(chunk));
      file.on("end", () => resolve(Buffer.concat(bufs)));
      file.on("error", (err) => reject(err));
    });

    let imageTensor;
    try {
      imageTensor = tf.node.decodeImage(imageBuffer, 3);
    } catch (err) {
      return h
        .response({
          status: "fail",
          message: "Terjadi kesalahan dalam melakukan prediksi",
        })
        .code(400);
    }

    // Check if the image is grayscale
    if (isGrayscale(imageTensor)) {
      return h
        .response({
          status: "fail",
          message: "Terjadi kesalahan dalam melakukan prediksi",
        })
        .code(400);
    }

    // Resize the image to ensure it fits the model's expected input shape
    const resizedImage = tf.image.resizeBilinear(imageTensor, [224, 224]).expandDims(0);

    let predictionResult;
    try {
      const predictions = model.predict(resizedImage);
      predictionResult = predictions.dataSync()[0];
    } catch (err) {
      return h
        .response({
          status: "fail",
          message: "Terjadi kesalahan dalam melakukan prediksi",
        })
        .code(400);
    }

    const result = predictionResult > 0.5 ? "Cancer" : "Non-cancer";
    const suggestion = result === "Cancer" ? "Segera periksa ke dokter!" : "Penyakit kanker tidak terdeteksi.";
    const id = uuid.v4();
    const createdAt = new Date().toISOString();

    const responseData = {
      id,
      result,
      suggestion,
      createdAt,
    };

    await firestore.collection("predictions").doc(id).set(responseData);

    return h
      .response({
        status: "success",
        message: "Model is predicted successfully",
        data: responseData,
      })
      .code(201);
  } catch (error) {
    return h
      .response({
        status: "fail",
        message: "Terjadi kesalahan dalam melakukan prediksi",
      })
      .code(400);
  }
};

const getHistories = async (request, h) => {
  const snapshot = await firestore.collection("predictions").get();
  const histories = snapshot.docs.map((doc) => ({ id: doc.id, history: doc.data() }));

  return h
    .response({
      status: "success",
      data: histories,
    })
    .code(200);
};

module.exports = { getpredictCancer, getHistories };
