from scripts.pipelines.load_games_pipeline import main as load_games_pipeline


def run_pipeline(name: str, pipeline_func) -> None:
    print(f"Starting pipeline: {name}")

    try:
        pipeline_func()
        print(f"Completed pipeline: {name}")
    except Exception as error:
        print(f"Failed pipeline: {name}")
        print(error)
        raise


def main() -> None:
    print("Starting AX Scout daily data refresh")

    run_pipeline("Load Games", load_games_pipeline)

    print("AX Scout daily data refresh complete")


if __name__ == "__main__":
    main()