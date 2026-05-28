type Props = {
  svg: string; // raw SVG inner content (paths/circles)
  large?: boolean;
};

export function IconTile({ svg, large }: Props) {
  return (
    <div className={large ? "icon-tile large" : "icon-tile"}>
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.75}
        strokeLinecap="round"
        strokeLinejoin="round"
        dangerouslySetInnerHTML={{ __html: svg }}
      />
    </div>
  );
}
