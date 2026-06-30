const sharpCloudflareStub = () => {
  throw new Error(
    "Sharp is not available in the Cloudflare Workers proof build. Image uploads must use the Node deployment until the Cloudflare image-processing slice is complete.",
  );
};

export default sharpCloudflareStub;
