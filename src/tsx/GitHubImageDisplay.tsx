import React from "react";

type GitHubImageDisplayProps = {
  repository: string;
  branch: string;
  path: string;
  clazz?: string;
  caption?: string;
  captionHint?: string;
  width?: number;
};

export default function GitHubImageDisplay({
  repository,
  branch,
  path,
  clazz,
  caption,
  captionHint,
  width,
}: GitHubImageDisplayProps) {
  const encodedPath = path
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");
  const imageUrl = `https://raw.githubusercontent.com/${repository}/${encodeURIComponent(branch)}/${encodedPath}`;

  return (
    <figure className="display-image">
      <img
        className={clazz}
        src={imageUrl}
        alt={caption ?? path}
        width={width}
        loading="lazy"
      />
      {caption || captionHint ? (
        <figcaption>
          {caption}
          {captionHint ? (
            <>
              <br />
              <code>{captionHint}</code>
            </>
          ) : null}
        </figcaption>
      ) : null}
    </figure>
  );
}
