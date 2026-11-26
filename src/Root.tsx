import { Composition, Folder } from "remotion";
import { HelloWorld } from "./HelloWorld";
import { Logo } from "./HelloWorld/Logo";
import { Title } from "./HelloWorld/Title";
import { ScorchieShort, SCORCHIE_FRAMES } from "./videos/scorchie/Scorchie";
import { GimliShort, GIMLI_FRAMES } from "./videos/gimli/Gimli";
import { ApolloShort, APOLLO_FRAMES } from "./videos/apollo/Apollo";
import { MinersShort, MINERS_FRAMES } from "./videos/miners/Miners";
import { EmuShort, EMU_FRAMES } from "./videos/emu/Emu";
import { BurpShort, BURP_FRAMES } from "./videos/burp/Burp";
import { OuchShort, OUCH_FRAMES } from "./videos/ouch/Ouch";
import { TickleShort, TICKLE_FRAMES } from "./videos/tickle/Tickle";
import { SneezeShort, SNEEZE_FRAMES } from "./videos/sneeze/Sneeze";
import { HiccupShort, HICCUP_FRAMES } from "./videos/hiccup/Hiccup";
import { Box } from "./test/Box";
import { BridgeShort, BRIDGE_FRAMES } from "./videos/bridge/Bridge";

// Each <Composition> is an entry in the sidebar!

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Folder name="Elements">
        <Composition
          id="Logo"
          component={Logo}
          durationInFrames={150}
          fps={30}
          width={1920}
          height={1080}
          defaultProps={{
            logoColor1: "#91EAE4",
            logoColor2: "#86A8E7",
          }}
        />
        <Composition
          id="Title"
          component={Title}
          durationInFrames={115}
          fps={30}
          width={1920}
          height={1080}
          defaultProps={{
            titleText: "Welcome to Remotion",
            titleColor: "#000000",
          }}
        />
      </Folder>
      <Composition
        // You can take the "id" to render a video:
        // bunx remotion render HelloWorld
        id="HelloWorld"
        component={HelloWorld}
        durationInFrames={150}
        fps={30}
        width={1920}
        height={1080}
        // You can override these props for each render:
        // https://www.remotion.dev/docs/parametrized-rendering
        defaultProps={{
          titleText: "Welcome to Remotion",
          titleColor: "#000000",
        }}
      />

      <Composition id="BridgeShort" component={BridgeShort} durationInFrames={BRIDGE_FRAMES} fps={30} width={1080} height={1920} />
      <Composition id="Box" component={Box} durationInFrames={30} fps={30} width={1080} height={1920} />
      <Composition id="ScorchieShort" component={ScorchieShort} durationInFrames={SCORCHIE_FRAMES} fps={30} width={1080} height={1920} />
      <Composition id="GimliShort" component={GimliShort} durationInFrames={GIMLI_FRAMES} fps={30} width={1080} height={1920} />
      <Composition id="ApolloShort" component={ApolloShort} durationInFrames={APOLLO_FRAMES} fps={30} width={1080} height={1920} />
      <Composition id="MinersShort" component={MinersShort} durationInFrames={MINERS_FRAMES} fps={30} width={1080} height={1920} />
      <Composition id="EmuShort" component={EmuShort} durationInFrames={EMU_FRAMES} fps={30} width={1080} height={1920} />
      <Composition id="BurpShort" component={BurpShort} durationInFrames={BURP_FRAMES} fps={30} width={1080} height={1920} />
      <Composition id="OuchShort" component={OuchShort} durationInFrames={OUCH_FRAMES} fps={30} width={1080} height={1920} />
      <Composition id="TickleShort" component={TickleShort} durationInFrames={TICKLE_FRAMES} fps={30} width={1080} height={1920} />
      <Composition id="SneezeShort" component={SneezeShort} durationInFrames={SNEEZE_FRAMES} fps={30} width={1080} height={1920} />
      <Composition id="HiccupShort" component={HiccupShort} durationInFrames={HICCUP_FRAMES} fps={30} width={1080} height={1920} />
    </>
  );
};
