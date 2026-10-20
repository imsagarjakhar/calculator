declare module "planner:controller:*" {
  const mount: (
    scope: import("./runtime/controllerScope").ControllerScope,
  ) => void;
  export default mount;
}
