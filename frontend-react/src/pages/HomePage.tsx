import type { ReactNode } from "react";
import messages from '../config/messages.json';

type HomePageProps = {
  title?: string;
  subtitle?: string;
  children: ReactNode;
};
const HomePage = ({ title = messages.home.defaultTitle, subtitle = messages.home.defaultSubtitle, children }: HomePageProps) => {
  return (
    <div>
      <h1>{title}</h1>
      <p>{subtitle}</p>
      <p>{children}</p>
    </div>
  );
};

export default HomePage;
