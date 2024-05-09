import { FC } from "react";

type FallbackComponentProps = {
  error: {
    message: string;
  };
};

const FallbackComponent: FC<FallbackComponentProps> = ({ error }) => {
  return (
    <>
      <p>Something went wrong :(</p>
      <p>{error.message}</p>
    </>
  );
};

export default FallbackComponent;
