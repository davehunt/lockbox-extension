/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

require("babel-polyfill");

import chai, { expect } from "chai";
import chaiEnzyme from "chai-enzyme";
import { mount } from "enzyme";
import React from "react";
import sinon from "sinon";
import sinonChai from "sinon-chai";

chai.use(chaiEnzyme);
chai.use(sinonChai);

import { simulateTyping } from "./common";
import mountWithL10n from "./mock-l10n";

import Button from "../src/webextension/widgets/button";
import DialogBox from "../src/webextension/widgets/dialog-box";
import FilterInput from "../src/webextension/widgets/filter-input";
import Input from "../src/webextension/widgets/input";
import PasswordInput from "../src/webextension/widgets/password-input";
import ScrollingList from "../src/webextension/widgets/scrolling-list";
import TextArea from "../src/webextension/widgets/text-area";

describe("widgets", () => {
  describe("<Button/>", () => {
    it("render button", () => {
      const wrapper = mount(<Button>click me</Button>);
      const realButton = wrapper.find("button");
      expect(realButton.text()).to.equal("click me");
      expect(realButton.prop("className")).to.equal("browser-style");
    });

    it("merge classNames", () => {
      const wrapper = mount(<Button className="foo">click me</Button>);
      const realButton = wrapper.find("button");
      expect(realButton.prop("className")).to.equal("browser-style foo");
    });

    it("focus() focuses button", () => {
      const wrapper = mount(<Button>click me</Button>);
      wrapper.instance().focus();
      const realButton = wrapper.find("button");
      expect(realButton.matchesElement(document.activeElement)).to.equal(
        true, "the element was not focused"
      );
    });
  });

  describe("<DialogBox/>", () => {
    let wrapper, onClickPrimary, onClickSecondary;
    beforeEach(() => {
      onClickPrimary = sinon.spy();
      onClickSecondary = sinon.spy();
      wrapper = mount(
        <DialogBox text="message" primaryButtonLabel="ok"
                   secondaryButtonLabel="cancel"
                   {...{onClickPrimary, onClickSecondary}}/>
      );
    });

    it("render dialog box", () => {
      expect(wrapper.find("div")).to.have.text("message");
    });

    it("onClickPrimary called", () => {
      wrapper.find("button").first().simulate("click");
      expect(onClickPrimary).to.have.callCount(1);
    });

    it("onClickSecondary called", () => {
      wrapper.find("button").last().simulate("click");
      expect(onClickSecondary).to.have.callCount(1);
    });
  });

  describe("<FilterInput/>", () => {
    it("render input", () => {
      const wrapper = mountWithL10n(<FilterInput value="some text"/>);
      expect(wrapper.find("input")).to.have.prop("value", "some text");
    });

    it("reset button clears filter", () => {
      const wrapper = mountWithL10n(<FilterInput/>);
      simulateTyping(wrapper.find("input"), "some text");
      wrapper.find("button").simulate("click");

      expect(wrapper.find("input")).to.have.prop("value", "");
    });

    it("onChange fired on input", () => {
      const onChange = sinon.spy();
      const wrapper = mountWithL10n(<FilterInput onChange={onChange}/>);
      simulateTyping(wrapper.find("input"), "text");

      expect(onChange).to.have.been.calledWith("text");
    });

    it("onChange fired on reset", () => {
      const onChange = sinon.spy();
      const wrapper = mountWithL10n(<FilterInput onChange={onChange}/>);
      simulateTyping(wrapper.find("input"), "text");
      wrapper.find("button").simulate("click");

      expect(onChange).to.have.been.calledWith("");
    });

    it("onChange not fired if no text changed", () => {
      const onChange = sinon.spy();
      const wrapper = mountWithL10n(<FilterInput onChange={onChange}/>);
      wrapper.find("button").simulate("click");

      expect(onChange).to.have.callCount(0);
    });
  });

  describe("<Input/>", () => {
    it("render input", () => {
      const wrapper = mount(<Input value="some text" onChange={() => {}}/>);
      expect(wrapper.find("input")).to.have.prop("value", "some text");
    });

    it("merge classNames", () => {
      const wrapper = mount(
        <Input className="foo" value="some text" onChange={() => {}}/>
      );
      const realInput = wrapper.find("input");
      expect(realInput.prop("className")).to.match(/ foo$/);
    });

    it("focus() focuses input", () => {
      const wrapper = mount(
        <Input className="foo" value="some text" onChange={() => {}}/>
      );
      wrapper.instance().focus();
      const realInput = wrapper.find("input");
      expect(realInput.matchesElement(document.activeElement)).to.equal(
        true, "the element was not focused"
      );
    });
  });

  describe("<PasswordInput/>", () => {
    it("render input", () => {
      const wrapper = mountWithL10n(
        <PasswordInput value="my password" onChange={() => {}}/>
      );
      expect(wrapper.find("input")).to.have.prop("value", "my password");
    });

    it("show/hide button toggles password visibility", () => {
      const wrapper = mountWithL10n(
        <PasswordInput value="password" onChange={() => {}}/>
      );
      const realInput = wrapper.find("input");
      const button = wrapper.find("button");

      expect(realInput).to.have.prop("type", "password");
      button.simulate("click");
      expect(realInput).to.have.prop("type", "text");
      button.simulate("click");
      expect(realInput).to.have.prop("type", "password");
    });
  });

  describe("<ScrollingList/>", () => {
    let wrapper, onItemSelected;

    beforeEach(() => {
      onItemSelected = sinon.spy();
    });

    describe("empty list", () => {
      beforeEach(() => {
        wrapper = mount(
          <ScrollingList data={[]} onItemSelected={onItemSelected}>
            {({item, ...props}) => {
              return (
                <li {...props}>{item.name}</li>
              );
            }}
          </ScrollingList>
        );
      });

      it("render list", () => {
        expect(wrapper.find("ul")).to.have.length(1);
        expect(wrapper.find("li")).to.have.length(0);
      });

      describe("onItemSelected()", () => {
        it("not dispatched on arrow down", () => {
          wrapper.simulate("keydown", {key: "ArrowDown"});
          expect(onItemSelected).to.have.callCount(0);
        });

        it("not dispatched on arrow up", () => {
          wrapper.simulate("keydown", {key: "ArrowUp"});
          expect(onItemSelected).to.have.callCount(0);
        });
      });
    });

    describe("filled list", () => {
      const data = [
        {id: "1", name: "item 1"},
        {id: "2", name: "item 2"},
        {id: "3", name: "item 3"},
      ];

      beforeEach(() => {
        wrapper = mount(
          <ScrollingList data={data} onItemSelected={onItemSelected}>
            {({name}) => {
              return (
                <div>{name}</div>
              );
            }}
          </ScrollingList>
        );
      });

      it("render list", () => {
        expect(wrapper.find("ul")).to.have.length(1);
        expect(wrapper.find("li")).to.have.length(3);
      });

      describe("onItemSelected()", () => {
        it("dispatched on clicking item", () => {
          wrapper.find("li").first().simulate("mousedown");
          expect(onItemSelected).to.have.been.calledWith("1");
        });

        it("dispatched on arrow down", () => {
          wrapper.setProps({selected: "1"});
          wrapper.simulate("keydown", {key: "ArrowDown"});
          expect(onItemSelected).to.have.been.calledWith("2");
        });

        it("dispatched on arrow up", () => {
          wrapper.setProps({selected: "3"});
          wrapper.simulate("keydown", {key: "ArrowUp"});
          expect(onItemSelected).to.have.been.calledWith("2");
        });

        it("dispatched on arrow down for no selection", () => {
          wrapper.simulate("keydown", {key: "ArrowDown"});
          expect(onItemSelected).to.have.been.calledWith("1");
        });

        it("dispatched on arrow up for no selection", () => {
          wrapper.simulate("keydown", {key: "ArrowUp"});
          expect(onItemSelected).to.have.been.calledWith("1");
        });

        it("not dispatched on arrow down for last item", () => {
          wrapper.setProps({selected: "3"});
          wrapper.simulate("keydown", {key: "ArrowDown"});
          expect(onItemSelected).to.have.callCount(0);
        });

        it("not dispatched on arrow up for first item", () => {
          wrapper.setProps({selected: "1"});
          wrapper.simulate("keydown", {key: "ArrowUp"});
          expect(onItemSelected).to.have.callCount(0);
        });

        it("not dispatched for irrelevant key press", () => {
          wrapper.simulate("keydown", {key: "Enter"});
          expect(onItemSelected).to.have.callCount(0);
        });
      });

      describe("scrolling", () => {
        it("scroll up into view", () => {
          const scrollIntoView = sinon.spy();
          wrapper.find("ul").get(0).scrollTop = 42;
          wrapper.find("li").get(0).scrollIntoView = scrollIntoView;
          wrapper.setProps({selected: "1"});

          expect(scrollIntoView).to.have.been.calledWith({
            behavior: "smooth", block: "start",
          });
        });

        it("scroll down into view", () => {
          const scrollIntoView = sinon.spy();
          wrapper.find("ul").get(0).scrollTop = -42;
          wrapper.find("li").get(2).scrollIntoView = scrollIntoView;
          wrapper.setProps({selected: "3"});

          expect(scrollIntoView).to.have.been.calledWith({
            behavior: "smooth", block: "end",
          });
        });

        it("does not scroll if selection is unchanged", () => {
          const scrollIntoView = sinon.spy();
          wrapper.find("ul").get(0).scrollTop = -42;
          wrapper.find("li").get(2).scrollIntoView = scrollIntoView;
          wrapper.setProps({selected: "3"});
          scrollIntoView.reset();
          wrapper.setProps({selected: "3"});

          expect(scrollIntoView).to.have.callCount(0);
        });
      });
    });
  });

  describe("<TextArea/>", () => {
    it("render textarea", () => {
      const wrapper = mount(<TextArea value="text" onChange={() => {}}/>);
      expect(wrapper.find("textarea")).to.have.prop("value", "text");
    });

    it("merge classNames", () => {
      const wrapper = mount(
        <TextArea className="foo" value="text" onChange={() => {}}/>
      );
      expect(wrapper.find("textarea")).to.have.prop(
        "className", "browser-style foo"
      );
    });
  });
});
