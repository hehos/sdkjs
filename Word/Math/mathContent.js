"use strict";

/// TODO

//  1.  Пересмотреть схему для findDisposition(base.js), т.к. если нажали за границами элемента, то происходит селект, т.к. теперь на mouseDown и mouseDown одни и те же функции
//  2.  поправить центр для delimiters (когда оператор текст)
//  3.  поправить accent расположение глифов в случае небольшого размера шрифта (н-р, 14)
//  5.  сделать gaps для мат. объектов, +, - в зависимости от расположения в контенте
//  6.  Размер разделительной черты для линейной дроби ограничить также как и для наклонной дроби
//  7.  баг с отрисовкой кругового интеграла
//  8.  cursor_Up, cursor_Down (+ c зажитым shift)
//  9.  Merge textPrp и mathTextPrp (bold, italic)
//  10. Поправить баги для CAccent с точками : смещение, когда идут подряд с одной точкой, двумя и тремя они перекрываются
//  11. Для управляющих символов запрашивать не getCtrPrp, getPrpToControlLetter (реализована, нужно только протащить для всех управляющих элементов)
//  12. объединение формул на remove и add
//  13. Для N-арных операторов в случае со степенью : итераторы занимают не 2/3 от основание, а примерно половину (когда один итератор сверху или снизу)
//  14. Для дробей, n-арных операторов и пр. считать расстояние исходя из shiftCenter
//  15. Для числителя/знаменателя сделать меньшие расстояния для внутренних дробей, меньшие по размеру n-арные операторы, значок радикала


//  TODO Refactoring
//  1. CAccent ~> COperator
//  2. COperator : объединить все классы связанные с отрисовкой и пересчетом операторов в один


/// TODO

// 1. Посмотреть стрелки и прочее для delimiters (которые используются для accent), при необходимости привести к одному типу

// 3. Проверить что будет, если какие-то настройки убрать/добавить из ctrPrp, влияют ли они на отрисовку управляющих элементов (например, Italic, Bold)
// 4. Протестировать n-арные операторы, когда добавляется текст вместо оператора (mouseDown не работает, выравнено как alignTop)

function CRPI()
{
    this.NeedResize      = true;
    this.bDecreasedComp  = false;
    this.bInline         = false;
    this.bChangeInline   = false;
    this.bNaryInline     = false; /*для CDegreeSupSub внутри N-арного оператора, этот флаг необходим, чтобы итераторы максимально близко друг к другу расположить*/
    this.bEqqArray       = false; /*для амперсанда*/
    this.bMathFunc       = false;
    this.PRS             = null;
}
CRPI.prototype.Copy = function()
{
    var RPI = new CRPI();

    RPI.NeedResize      = this.NeedResize;
    RPI.bInline         = this.bInline;
    RPI.bDecreasedComp  = this.bDecreasedComp;
    RPI.bChangeInline   = this.bChangeInline;
    RPI.bNaryInline     = this.bNaryInline;
    RPI.bEqqArray       = this.bEqqArray;
    RPI.bMathFunc       = this.bMathFunc;
    RPI.PRS             = this.PRS;

    return RPI;
}

function CMathPointInfo()
{
    this.x    = 0;
    this.y    = 0;

    this.bEven      = true;
    this.CurrPoint  = 0;

    this.InfoPoints = {};
}
CMathPointInfo.prototype.SetInfoPoints = function(InfoPoints)
{
    this.InfoPoints.GWidths       = InfoPoints.GWidths;
    this.InfoPoints.GPoints       = InfoPoints.GPoints;
    this.InfoPoints.ContentPoints = InfoPoints.ContentPoints.Widths;
    this.InfoPoints.GMaxDimWidths = InfoPoints.GMaxDimWidths;
}
CMathPointInfo.prototype.UpdateX = function(value)
{
    this.x += value;
}
CMathPointInfo.prototype.NextAlignRange = function()
{
    if(this.bEven)
        this.bEven = false;
    else
    {
        this.CurrPoint++;
        this.bEven = true;
    }
}
CMathPointInfo.prototype.ApplyAlign = function()
{
    this.x += this.GetAlign();
}
CMathPointInfo.prototype.GetAlign = function()
{
    var align = 0;

    if(this.bEven)
    {
        var alignEven, alignGeneral, alignOdd;

        var Len   = this.InfoPoints.ContentPoints.length,
            Point = this.InfoPoints.ContentPoints[this.CurrPoint];

        var GWidth = this.InfoPoints.GWidths[this.CurrPoint],
            GPoint = this.InfoPoints.GPoints[this.CurrPoint];

        if(this.CurrPoint == Len - 1 && Point.odd == -1) // то есть последняя точка четная, выравнивание по центру
        {
            var GMaxDimWidth = this.InfoPoints.GMaxDimWidths[this.CurrPoint];

            alignGeneral = (GMaxDimWidth - Point.even)/2;
            alignEven = 0;
        }
        else
        {
            alignGeneral = (GWidth - GPoint.even - GPoint.odd)/2;
            alignEven = GPoint.even - Point.even;
        }

        if(this.CurrPoint > 0)
        {
            var PrevGenPoint = this.InfoPoints.GPoints[this.CurrPoint-1],
                PrevGenWidth = this.InfoPoints.GWidths[this.CurrPoint-1],
                PrevPoint    = this.InfoPoints.ContentPoints[this.CurrPoint-1];

            var alignPrevGen = (PrevGenWidth - PrevGenPoint.even - PrevGenPoint.odd)/2;
            alignOdd = alignPrevGen +  PrevGenPoint.odd - PrevPoint.odd;
        }
        else
            alignOdd = 0;

        align = alignGeneral + alignEven + alignOdd;
    }

    return align;
}

function CInfoPoints()
{
    this.GWidths       = null;
    this.GPoints       = null;
    this.GMaxDimWidths = null;
    this.ContentPoints = new AmperWidths();
}
CInfoPoints.prototype.SetDefault = function()
{
    this.GWidths       = null;
    this.GPoints       = null;
    this.GMaxDimWidths = null;
    this.ContentPoints.SetDefault();
}


function CMathPosition()
{
    this.x  = 0;
    this.y  = 0;
}


function AmperWidths()
{
    this.bEven     = true; // является ли текущая точка нечетной
    this.Widths    = [];
}
AmperWidths.prototype.UpdatePoint = function(value)
{
    var len = this.Widths.length;

    if(len == 0)
    {
        // дефолтное значение bEven true, для случая если первый элемент в контенте будет Ampersand
        var NewPoint = new CMathPoint();
        NewPoint.even = value;
        this.Widths.push(NewPoint);
        this.bEven = true;
    }
    else
    {
        if(this.bEven)
            this.Widths[len-1].even += value;
        else
            this.Widths[len-1].odd += value;
    }

}
AmperWidths.prototype.AddNewAlignRange = function()
{
    var len = this.Widths.length;

    if(!this.bEven || len == 0)
    {
        var NewPoint = new CMathPoint();
        NewPoint.even = 0;
        this.Widths.push(NewPoint);
    }

    if(this.bEven)
    {
        len = this.Widths.length;
        this.Widths[len-1].odd = 0;
    }


    this.bEven = !this.bEven;

}
AmperWidths.prototype.SetDefault = function()
{
    this.bEven         = true;
    this.Widths.length = 0;
}


function CGaps(oSign, oEqual, oZeroOper, oLett)
{
    this.sign = oSign;
    this.equal = oEqual;
    this.zeroOper = oZeroOper;
    this.letters = oLett;
}

function CCoeffGaps()
{
    this.Sign =
    {
        left:   new CGaps(0.52, 0.26, 0, 0.52),
        right:  new CGaps(0.49, 0, 0, 0.49)
    };

    this.Mult =
    {
        left:   new CGaps(0, 0, 0, 0.46),
        right:  new CGaps(0, 0, 0, 0.49)
    };

    /*this.Equal =
    {
        left:   new CGaps(0.35, 0, 0, 0.7),
        right:  new CGaps(0.25, 0, 0, 0.5)
    };*/

    this.Equal =
    {
        left:   new CGaps(0, 0, 0, 0.7),
        right:  new CGaps(0, 0, 0, 0.5)
    };

    this.Default =
    {
        left:   new CGaps(0, 0, 0, 0),
        right:  new CGaps(0, 0, 0, 0)
    };
}
CCoeffGaps.prototype =
{
    getCoeff: function(codeCurr, codeLR , direct) // obj - либо codeChar, либо мат объект
    {
        var operator = null;

        if(this.checkEqualSign(codeCurr))
            operator = this.Equal;
        else if(this.checkOperSign(codeCurr))
            operator = this.Sign;
        else if(codeCurr == 0x2A)
            operator = this.Mult;
        else
            operator = this.Default;

        var part = direct == -1 ? operator.left : operator.right;

        var coeff = 0;
        if(codeLR == -1) // мат объект
            coeff = part.letters;
        else if(this.checkOperSign(codeLR))
            coeff = part.sign;
        else if(this.checkEqualSign(codeLR))
            coeff = part.equal;
        else if(this.checkZeroSign(codeLR, direct))
            coeff = part.zeroOper;
        else
            coeff = part.letters;

        return coeff;
    },
    checkOperSign: function(code) // "+", "-", "±"
    {
        var PLUS       = 0x2B,
            MINUS      = 0x2D,
            PLUS_MINUS = 0xB1;

        return code == PLUS || code == MINUS || code == PLUS_MINUS;
    },
    checkEqualSign: function(code)
    {
        var COMPARE       = code == 0x3C || code == 0x3E; // LESS, GREATER
        var ARROWS        = (code >= 0x2190 && code <= 0x21B3) || (code == 0x21B6) || (code == 0x21B7) || (code >= 0x21BA && code <= 0x21E9) || (code >=0x21F4 && code <= 0x21FF);
        var INTERSECTION  = code >= 0x2223 && code <= 0x222A;
        var EQUALS        = code == 0x3D || (code >= 0x2234 && code <= 0x22BD) || (code >= 0x22C4 && code <= 0x22FF);
        var ARR_FISHES    = (code >= 0x27DA && code <= 0x27E5) || (code >= 0x27EC && code <= 0x297F);
        var TRIANGLE_SYMB = code >= 0x29CE && code <= 0x29D7;
        var OTH_SYMB      = code == 0x29DF || (code >= 0x29E1 && code <= 0x29E7) || (code >= 0x29F4 && code <= 0x29F8) || (code >= 0x2A22 && code <= 0x2AF0) || (code >= 0x2AF2 && code <= 0x2AFB) || code == 0x2AFD || code == 0x2AFE;


        return COMPARE || ARROWS || INTERSECTION || EQUALS || ARR_FISHES || TRIANGLE_SYMB || OTH_SYMB;
    },
    checkZeroSign: function(code, direct) // "*", "/", "\"
    {
        var MULT     = 0x2A,
            DIVISION = 0x2F,
            B_SLASH  = 0x5C;

        var bOper = code == MULT || code == DIVISION || code == B_SLASH;
        var bLeftBracket = direct == -1 && (code == 0x28 || code == 0x5B || code == 0x7B);
        var bRightBracket = direct == 1 && (code == 0x29 || code == 0x5D || code == 0x7D);


        return bOper || bLeftBracket || bRightBracket;
    }
}

var COEFF_GAPS = new CCoeffGaps();

function CMathArgSize()
{
    this.value       = undefined;
}
CMathArgSize.prototype =
{
    decrease: function()
    {
        if(this.value == undefined)
            this.value = 0;

        if( this.value > -2 )
            this.value--;
    },
    increase: function()
    {
        if(this.value == undefined)
            this.value = 0;

        if(this.value < 2)
            this.value++;
    },
    Set: function(ArgSize)
    {
        this.value = ArgSize.value;
    },
    SetValue: function(val)
    {
        if(val < - 2)
            this.value = -2;
        else if(val > 2)
            this.value = 2;
        else
            this.value = val;

    },
    Copy: function()
    {
        var ArgSize = new CMathArgSize();
        ArgSize.value = this.value;

        return ArgSize;
    },
    Merge: function(ArgSize)
    {
        if(this.value == undefined)
            this.value = 0;

        if(ArgSize.value == undefined)
            ArgSize.value = 0;

        this.SetValue(this.value + ArgSize.value);
    }
}

function CMathGapsInfo(argSize)
{
    //this.measure = oMeasure;

    //this.Parent   = Parent;
    //this.ParaMath = this.Parent.ParaMath; // для Para_Run

    this.argSize = argSize; // argSize выставляем один раз для всего контента
    //this.leftRunPrp = null; // Run_Prp левого элемента
    //this.currRunPrp = null;

    this.Left    = null;    // элемент слева
    this.Current = null;    // текущий элемент

    this.LeftFontSize    = null;
    this.CurrentFontSize = null;

}
CMathGapsInfo.prototype =
{
    setGaps: function(Current, CurrentFontSize)
    {
        this.Left = this.Current;
        this.LeftFontSize = this.CurrentFontSize;

        this.Current = Current;
        this.CurrentFontSize = CurrentFontSize;

        if(this.argSize < 0)
        {
            this.Current.GapLeft = 0;

            if(this.Left !== null)
                this.Left.GapRight = 0;
        }
        else
        {
            var leftCoeff = 0,  /// for Current Object
                rightCoeff = 0; /// for Left Object

            var leftCode;

            if(this.Current.Type == para_Math_Text)
            {
                var currCode = this.Current.getCodeChr();

                if(this.Left !== null)
                {
                    if(this.Left.Type == para_Math_Composition)
                    {
                        rightCoeff = this.getGapsMComp(this.Left, 1);
                        leftCoeff = COEFF_GAPS.getCoeff(currCode, -1, -1);

                        if(leftCoeff > rightCoeff)
                            leftCoeff -= rightCoeff;
                    }
                    else if(this.Left.Type == para_Math_Text)
                    {
                        leftCode = this.Left.getCodeChr();
                        leftCoeff = COEFF_GAPS.getCoeff(currCode, leftCode, -1);
                        rightCoeff = COEFF_GAPS.getCoeff(leftCode, currCode, 1);
                    }

                }
                else
                    this.Current.GapLeft = 0;
            }
            else if(this.Current.Type == para_Math_Composition)
            {
                leftCoeff = this.getGapsMComp(this.Current, -1);

                if(this.Left != null)
                {
                    if(this.Left.Type == para_Math_Composition)
                    {
                        rightCoeff = this.getGapsMComp(this.Left, 1);

                        if(rightCoeff/2 > leftCoeff)
                            rightCoeff -= leftCoeff;
                        else
                            rightCoeff /= 2;

                        if(leftCoeff < rightCoeff/2)
                            leftCoeff = rightCoeff/2;
                        else
                            leftCoeff -= rightCoeff/2;
                    }
                    else if(this.Left.Type == para_Math_Text)
                    {
                        leftCode = this.Left.getCodeChr();
                        rightCoeff = COEFF_GAPS.getCoeff(leftCode, -1, 1);
                        if(rightCoeff > leftCoeff)
                            rightCoeff -= leftCoeff;
                    }
                }
                else
                    leftCoeff = 0;
            }

            leftCoeff = Math.ceil(leftCoeff*10)/10;
            rightCoeff = Math.ceil(rightCoeff*10)/10;

            var LGapSign = 0.1513*this.CurrentFontSize;
            this.Current.GapLeft = Math.ceil(leftCoeff*LGapSign*10)/10; // если ни один случай не выполнился, выставляем "нулевые" gaps (default): необходимо, если что-то удалили и объект стал первый или последним в контенте

            if(this.Left != null)
            {
                var RGapSign = 0.1513*this.LeftFontSize;
                this.Left.GapRight = Math.ceil(rightCoeff*RGapSign*10)/10;
            }
        }
    },
    getGapsMComp: function(MComp, direct)
    {
        var kind = MComp.kind;
        var checkGap = this.checkGapKind(kind);

        var bNeedGap = !checkGap.bEmptyGaps && !checkGap.bChildGaps;

        var coeffLeft  = 0.001,
            coeffRight = 0; // for checkGap.bEmptyGaps

        //var bDegree = kind == MATH_DEGREE || kind == MATH_DEGREESubSup;
        var bDegree = kind == MATH_DEGREE;

        if(checkGap.bChildGaps)
        {
            if(bDegree)
            {
                coeffLeft  = 0.03;

                if(MComp.IsPlhIterator())
                    coeffRight = 0.12;
                else
                    coeffRight = 0.16;
            }

            var gapsChild = MComp.getGapsInside(this);

            coeffLeft  = coeffLeft  < gapsChild.left  ? gapsChild.left  : coeffLeft;
            coeffRight = coeffRight < gapsChild.right ? gapsChild.right : coeffRight;
        }
        else if(bNeedGap)
        {
            coeffLeft = 0.4;
            coeffRight = 0.3;
        }


        return direct == -1 ? coeffLeft : coeffRight;
    },
    checkGapKind: function(kind)
    {
        var bEmptyGaps = kind == MATH_DELIMITER || kind == MATH_MATRIX,
            bChildGaps = kind == MATH_DEGREE || kind == MATH_DEGREESubSup || kind == MATH_ACCENT || kind == MATH_RADICAL|| kind == MATH_BOX || kind == MATH_BORDER_BOX || (kind == MATH_DELIMITER);

        return  {bEmptyGaps: bEmptyGaps, bChildGaps: bChildGaps};
    }

}

function CMPrp()
{
    this.sty      = undefined;
    this.scr      = undefined;
    this.nor      = undefined;

    this.aln      = undefined;
    this.brk      = undefined;
    this.lit      = undefined;

    // Default
    /*this.sty      = STY_ITALIC;
    this.scr      = TXT_ROMAN;

    this.nor      = false;

    this.aln      = false;
    this.brk      = false;
    this.lit      = false;*/

    // TXT_NORMAL
    // если normal == false, то берем TextPrp отсюда (в wRunPrp bold/italic не учитываем, выставляем отсюда)
    // если normal == true, то их Word не учитывает и берет TextPr из wRunPrp

    // TXT_PLAIN
    // если plain == true
    // буквы берутся обычные, не специальные для Cambria Math : то есть как для TXT_NORMAL
    // отличие от TXT_NORMAL w:rPrp в этом случае не учитываются !

}
CMPrp.prototype =
{
    getPropsForWrite: function()
    {
        var props =
        {
            aln:    this.aln,
            brk:    this.brk,
            lit:    this.lit,
            nor:    this.nor,
            sty:    this.sty,
            scr:    this.scr
        };

        return props;
    },
    GetTxtPrp: function()
    {
        var textPrp = new CTextPr();

        if(this.sty == undefined)
        {
            textPrp.Italic = true;
            textPrp.Bold   = false;
        }
        else
        {
            textPrp.Italic = this.sty == STY_BI || this.sty == STY_ITALIC;
            textPrp.Bold   = this.sty == STY_BI || this.sty == STY_BOLD;
        }


        return textPrp;
    },
    Copy: function()
    {
        var NewMPrp = new CMPrp();
        
        NewMPrp.aln      = this.aln;
        NewMPrp.lit      = this.lit;
        NewMPrp.nor      = this.nor;
        NewMPrp.sty      = this.sty;
        NewMPrp.scr      = this.scr;

        if(this.brk !== undefined)
            NewPr.brk = this.brk.Copy();
        
        return NewMPrp;
    },
    GetCompiled_ScrStyles : function()
    {
        var nor = this.nor == undefined ? false : this.nor;
        var scr = this.scr == undefined ? TXT_ROMAN : this.scr;
        var sty = this.sty == undefined ? STY_ITALIC : this.sty;

        return {nor: nor, scr: scr, sty: sty};
    },
    SetStyle: function(Bold, Italic) /// из ctrPrp получить style для MathPrp
    {
        if(Bold == true && Italic == true)
            this.sty = STY_BI;
        else if(Italic == true)
            this.sty = STY_ITALIC;
        else if(Bold == true)
            this.sty = STY_BOLD;
        else if(Bold == false && Italic == false)
            this.sty = STY_PLAIN;
        else
            this.sty = undefined;
    }
}


//TODO
//пересмотреть this.dW и this.dH


function CMathContent()
{
	this.Id = g_oIdCounter.Get_NewId();		

    this.content = []; // array of mathElem

    this.CurPos = 0;
    this.WidthToElement = [];
    this.pos = new CMathPosition();   // относительная позиция

    //  Properties
    this.ParaMath       = null;
    this.ArgSize        = new CMathArgSize();
    this.Compiled_ArgSz = new CMathArgSize();

    // for EqqArray
    this.InfoPoints = new CInfoPoints();
    ///////////////

    this.plhHide    = false;
    this.bRoot      = false;
    //////////////////

    this.Selection =
    {
        Start:  0,
        End:    0,
        Use:    false
    };

    this.RecalcInfo =
    {
        TextPr:             true,
        bEqqArray:          false,
        bChangeInfoPoints:  false
    };

    this.NearPosArray = [];
    this.ParentElement = null;

    this.size = new CMathSize();
	
	// Добавляем данный класс в таблицу Id (обязательно в конце конструктора)
	g_oTableId.Add( this, this.Id );
}
CMathContent.prototype =
{
    constructor: CMathContent,
    init: function()
    {

    },
    addElementToContent: function(obj)   //for "read"
    {
        this.Internal_Content_Add(this.content.length, obj, false);
        this.CurPos = this.content.length-1;
    },
    fillPlaceholders: function()
    {
        this.content.length = 0;

        var oMRun = new ParaRun(null, true);
        oMRun.fillPlaceholders();
        this.addElementToContent(oMRun);

        /*var placeholder = new CMathText(false);
        //placeholder.relate(this);
        placeholder.fillPlaceholders();

        this.content.push( placeholder );*/
    },
    //////////////////////////////////////
    /*recalculateSize: function()
    {
        var width      =   0 ;
        var ascent     =   0 ;
        var descent    =   0 ;

        var oSize;

        this.WidthToElement.length = 0;

        for(var i = 0; i < this.content.length; i++)
        {
            if(this.content[i].Type == para_Math_Composition)
                this.content[i].ApplyGaps();
            else if(this.content[i].Type == para_Math_Run)
                this.content[i].Math_ApplyGaps();

            this.WidthToElement[i] = width;

            oSize = this.content[i].size;
            width += oSize.width;

            ascent = ascent > oSize.ascent ? ascent : oSize.ascent;
            var oDescent = oSize.height - oSize.ascent;
            descent =  descent < oDescent ? oDescent : descent;
        }

        this.size = {width: width, height: ascent + descent, ascent: ascent};
    },*/

    PreRecalc: function(Parent, ParaMath, ArgSize, RPI)
    {
        if(ArgSize !== null && ArgSize !== undefined)
        {
            this.Compiled_ArgSz.value = this.ArgSize.value;
            this.Compiled_ArgSz.Merge(ArgSize);
        }

        this.ParaMath = ParaMath;
        if(Parent !== null)
        {
            this.bRoot = false;
            this.Parent = Parent;
        }

        if(ArgSize !== null && ArgSize !== undefined)
        {
            this.Compiled_ArgSz.value = this.ArgSize.value;
            this.Compiled_ArgSz.Merge(ArgSize);
        }

        var lng = this.content.length;

        var GapsInfo = new CMathGapsInfo(this.Compiled_ArgSz.value);

        for(var pos = 0; pos < lng; pos++)
        {
            if(this.content[pos].Type == para_Math_Composition)
            {
                this.content[pos].PreRecalc(this, ParaMath, this.Compiled_ArgSz, RPI, GapsInfo);
            }
            else if(this.content[pos].Type == para_Math_Run)
                this.content[pos].Math_PreRecalc(this, ParaMath, this.Compiled_ArgSz, RPI, GapsInfo);
        }

        if(GapsInfo.Current !== null)
            GapsInfo.Current.GapRight = 0;

    },
    Resize: function(oMeasure, RPI)      // пересчитываем всю формулу
    {
        this.WidthToElement.length = 0;
        this.RecalcInfo.bEqqArray = RPI.bEqqArray;

        var lng = this.content.length;

        this.size.SetZero();
        this.InfoPoints.SetDefault();

        for(var pos = 0; pos < lng; pos++)
        {
            if(this.content[pos].Type == para_Math_Composition)
            {
                var NewRPI = RPI.Copy();
                NewRPI.bEqqArray    = false;

                this.content[pos].Resize(oMeasure, NewRPI);

                if(RPI.bEqqArray)
                    this.InfoPoints.ContentPoints.UpdatePoint(this.content[pos].size.width);
            }
            else if(this.content[pos].Type == para_Math_Run)
            {
                //this.content[pos].Recalculate_Range();
                this.content[pos].Math_Recalculate(oMeasure, RPI, this.InfoPoints.ContentPoints);
            }

            this.WidthToElement[pos] = this.size.width;

            var oSize = this.content[pos].size;
            this.size.width += oSize.width;

            var oDescent = oSize.height - oSize.ascent,
                SizeDescent = this.size.height - this.size.ascent;

            this.size.ascent = this.size.ascent > oSize.ascent ? this.size.ascent : oSize.ascent;

            this.size.height = SizeDescent < oDescent ? oDescent + this.size.ascent : SizeDescent + this.size.ascent;
        }
    },
    // особый случай: вызываем, когда пересчет всей формулы не нужен, а нужно выставить только Lines (Реализована, чтобы не править Resize у каждого элемента)
    Resize_2: function(oMeasure, Parent, ParaMath, RPI, ArgSize)
    {
        var lng = this.content.length;
        for(var i = 0; i < lng; i++)
        {
            if(this.content[i].Type == para_Math_Composition)
                this.content[i].Resize_2(oMeasure, this, ParaMath, RPI, ArgSize);
            else
                this.content[i].Math_Recalculate(oMeasure, RPI, null);
        }
    },
    getWidthsPoints: function()
    {
        return this.InfoPoints.ContentPoints.Widths;
    },
    IsEqqArray: function()
    {
        return this.Parent.IsEqqArray();
    },
    Get_CompiledArgSize: function()
    {
        return this.Compiled_ArgSz;
    },
    getGapsInside: function(GapsInfo) // учитываем gaps внутренних объектов
    {
        var gaps = {left: 0, right: 0};
        var bFirstComp = false,
            bLastComp = false;

        var len = this.content.length;

        if(len > 1)
        {
            var bFRunEmpty = this.content[0].Is_Empty();
            bFirstComp = bFRunEmpty && this.content[1].Type == para_Math_Composition; // первый всегда идет Run

            var bLastRunEmpty = this.content[len - 1].Is_Empty(); // т.к. после мат. объекта стоит пустой Run
            bLastComp = bLastRunEmpty && this.content[len - 2].Type == para_Math_Composition;
        }

        var checkGap;

        if(bFirstComp)
        {
            checkGap = GapsInfo.checkGapKind(this.content[1].kind);

            if(!checkGap.bChildGaps)
            {
                gaps.left = GapsInfo.getGapsMComp(this.content[1], -1);
                //gaps.left = gapsMComp.left;
            }
        }

        if(bLastComp)
        {
            checkGap = GapsInfo.checkGapKind(this.content[len - 1].kind);

            if(!checkGap.bChildGaps)
            {
                gaps.right = GapsInfo.getGapsMComp(this.content[len - 1], 1);
                //gaps.right = gapsMComp.right;
            }
        }

        return gaps;
    },
    IsOneLineText: function()   // for degree
    {
        var bOneLineText = true;

        for(var i = 0; i < this.content.length; i++)
        {
            if(this.content[i].Type == para_Math_Composition)
            {
                if(!this.content[i].IsOneLineText())
                {
                    bOneLineText = false;
                    break;
                }
            }
        }

        return bOneLineText;
    },
    draw: function(x, y, pGraphics)
    {
        var bHidePlh = this.plhHide && this.IsPlaceholder();

        if( !bHidePlh )
        {
            for(var i=0; i < this.content.length;i++)
            {
                if(this.content[i].Type == para_Math_Composition)
                {
                    this.content[i].draw(x, y, pGraphics);
                }
                else
                    this.content[i].Math_Draw(x, y, pGraphics);
            }
        }
    },
    update_Cursor: function(CurPage, UpdateTarget)
    {
        var result;
        if(this.content[this.CurPos].Type == para_Math_Composition)
        {
            result = this.content[this.CurPos].update_Cursor(CurPage, UpdateTarget);
        }
        else
        {
            var X = this.pos.x + this.ParaMath.X + this.WidthToElement[this.CurPos],
                Y = this.pos.y + this.ParaMath.Y + this.size.ascent;

            result = this.content[this.CurPos].Math_Update_Cursor(X, Y, CurPage, UpdateTarget);
        }

        return result;
    },
    setCtrPrp: function()
    {

    },
    getInfoLetter: function(Info)
    {
        if(this.content.length == 1)
            this.content[0].Math_GetInfoLetter(Info);
        else
            Info.Result = false;
    },
    IsPlaceholder: function()
    {
        var flag = false;
        if(!this.bRoot && this.content.length == 1)
            flag  = this.content[0].IsPlaceholder();

        return flag;
    },
    IsJustDraw: function()
    {
        return false;
    },
    setPosition: function(pos)
    {
        this.pos.x = pos.x;
        this.pos.y = pos.y;

        var PosInfo = new CMathPointInfo();
        PosInfo.x = this.pos.x;
        PosInfo.y = this.pos.y + this.size.ascent;

        if(this.RecalcInfo.bEqqArray)
        {
            this.InfoPoints.GWidths       = this.Parent.WidthsPoints;
            this.InfoPoints.GPoints       = this.Parent.Points;
            this.InfoPoints.GMaxDimWidths = this.Parent.MaxDimWidths;

            PosInfo.SetInfoPoints(this.InfoPoints);
            PosInfo.ApplyAlign();

        }

        for(var i=0; i < this.content.length; i++)
        {
            if(this.content[i].Type == para_Math_Run)
            {
                this.content[i].Math_SetPosition(PosInfo);
            }
            else
            {
                var NewPos = new CMathPosition();
                NewPos.x = PosInfo.x;
                NewPos.y = PosInfo.y;

                this.content[i].setPosition(NewPos);
                PosInfo.UpdateX(this.content[i].size.width);
            }
        }
    },
    ///// properties /////
    SetDot: function(flag)
    {
        this.bDot = flag;
    },
    hidePlaceholder: function(flag)
    {
        this.plhHide = flag;
    },
    ///////// RunPrp, CtrPrp
    getFirstRPrp:    function(ParaMath)
    {
        return this.content[0].Get_CompiledPr(true);
    },
    GetCtrPrp: function()       // for placeholder
    {
        var ctrPrp = new CTextPr();
        if(!this.bRoot)
            ctrPrp.Merge( this.Parent.Get_CompiledCtrPrp_2() );

        return ctrPrp;
    },
    IsAccent: function()
    {
        var result = false;

        if(!this.bRoot)
            result = this.Parent.IsAccent();

        return result;
    },
    ////////////////////////

    /// For Para Math
    GetParent: function()
    {
        return this.Parent.GetParent();
    },
    SetArgSize: function(val)
    {
        this.ArgSize.SetValue(val);
    },
    GetArgSize: function()
    {
        return this.ArgSize.value;
    },

    /////////   Перемещение     ////////////

    // Поиск позиции, селект

    Is_SelectedAll: function(Props)
    {
        var bFirst = false, bEnd = false;

        if(this.Selection.Start == 0 && this.Selection.End == this.content.length - 1)
        {
            if(this.content[this.Selection.Start].Type == para_Math_Run)
                bFirst = this.content[this.Selection.Start].Is_SelectedAll(Props);
            else
                bFirst = true;

            if(this.content[this.Selection.End].Type == para_Math_Run)
                bEnd = this.content[this.Selection.End].Is_SelectedAll(Props);
            else
                bEnd = true;
        }

        return bFirst && bEnd;
    },

    ///////////////////////

    Get_Id : function()
    {
        return this.GetId();
    },
    GetId : function()
    {
        return this.Id;
    },

    private_CorrectContent : function()
    {
        var len = this.content.length;

        var current = null;
        var emptyRun, ctrPrp, mathPrp;

        var currPos = 0;

        while(currPos < len)
        {
            current = this.content[currPos];

            var bLeftRun  = currPos > 0 ? this.content[currPos-1].Type == para_Math_Run : false,
                bRightRun = currPos < len - 1 ? this.content[currPos + 1].Type === para_Math_Run : false;

            var bCurrComp = current.Type == para_Math_Composition,
                bCurrEmptyRun = current.Type == para_Math_Run && current.Is_Empty();

            var bDeleteEmptyRun = bCurrEmptyRun && (bLeftRun || bRightRun);

            if(bCurrComp && !bLeftRun) // добавление пустого Run перед мат объектом
            {
                emptyRun = new ParaRun(null, true);

                ctrPrp = current.Get_CtrPrp();

                mathPrp = new CMPrp();

                mathPrp.SetStyle(ctrPrp.Bold, ctrPrp.Italic);

                emptyRun.Set_MathPr(mathPrp);

                ctrPrp.Bold   = undefined;
                ctrPrp.Italic = undefined;

                emptyRun.Set_Pr(ctrPrp);

                this.Internal_Content_Add(currPos, emptyRun);
                currPos += 2;
            }
            else if(bDeleteEmptyRun)
            {
                this.Remove_FromContent(currPos, 1);

                if (this.CurPos === currPos)
                {
                    if (bLeftRun)
                    {
                        this.CurPos = currPos - 1;
                        this.content[this.CurPos].Cursor_MoveToEndPos(false);
                    }
                    else //if (bRightRun)
                    {
                        this.CurPos = currPos;
                        this.content[this.CurPos].Cursor_MoveToStartPos();
                    }
                }
            }
            else
                currPos++;

            len = this.content.length;
        }


        if(len > 0 && this.content[len - 1].Type == para_Math_Composition)
        {
            emptyRun = new ParaRun(null, true);

            ctrPrp = current.Get_CtrPrp();

            mathPrp = new CMPrp();
            mathPrp.SetStyle(ctrPrp.Bold, ctrPrp.Italic);

            emptyRun.Set_MathPr(mathPrp);

            ctrPrp.Bold   = undefined;
            ctrPrp.Italic = undefined;

            emptyRun.Set_Pr(ctrPrp);

            this.Internal_Content_Add(len, emptyRun);
        }
    },

    Correct_Content : function(bInnerCorrection)
    {
        if (true === bInnerCorrection)
        {
            for (var nPos = 0, nCount = this.content.length; nPos < nCount; nPos++)
            {
                if (para_Math_Composition === this.content[nPos].Type)
                    this.content[nPos].Correct_Content(true);
            }
        }

        this.private_CorrectContent();

        // Удаляем лишние пустые раны
        for (var nPos = 0, nLen = this.content.length; nPos < nLen - 1; nPos++)
        {
            var oCurrElement = this.content[nPos];
            var oNextElement = this.content[nPos + 1];
            if (para_Math_Run === oCurrElement.Type && para_Math_Run === oNextElement.Type)
            {
                if (oCurrElement.Is_Empty())
                {
                    this.Remove_FromContent(nPos);
                    nPos--;
                    nLen--;
                }
                else if (oNextElement.Is_Empty())
                {
                    this.Remove_FromContent(nPos + 1);
                    nPos--;
                    nLen--;
                }
            }

            if(para_Math_Run === oCurrElement.Type)
                oCurrElement.Math_Correct_Content();
        }

        // Если в контенте ничего нет, тогда добавляем пустой ран
        if (this.content.length < 1)
        {
            this.Add_ToContent(0, new ParaRun(null, true));
        }

        for (var nPos = 0, nCount = this.content.length; nPos < nCount; nPos++)
        {
            if(para_Math_Run === this.content[nPos].Type)
                this.content[nPos].Math_Correct_Content();
        }

        if (this.content.length == 1)
        {
            if(this.content[0].Is_Empty())
                this.content[0].fillPlaceholders();
        }
    },

    Correct_ContentPos : function(nDirection)
    {
        var nCurPos = this.CurPos;

        if (nCurPos < 0)
        {
            this.CurPos = 0;
            this.content[0].Cursor_MoveToStartPos();
        }
        else if (nCurPos > this.content.length - 1)
        {
            this.CurPos = this.content.length - 1;
            this.content[this.CurPos].Cursor_MoveToEndPos();
        }
        else if (para_Math_Run !== this.content[nCurPos].Type)
        {
            if (nDirection > 0)
            {
                this.CurPos = nCurPos + 1;
                this.content[this.CurPos].Cursor_MoveToStartPos();
            }
            else
            {
                this.CurPos = nCurPos - 1;
                this.content[this.CurPos].Cursor_MoveToEndPos();
            }
        }
    },

    /// функции для работы с курсором
    Cursor_MoveToStartPos: function()
    {
        if(!this.Is_Empty())
        {
            this.CurPos = 0;

            this.content[0].Cursor_MoveToStartPos();
        }
    },
    Cursor_MoveToEndPos: function(SelectFromEnd)
    {
        if(!this.Is_Empty())
        {
            var len = this.content.length - 1;
            this.CurPos = len;

            this.content[len].Cursor_MoveToEndPos(SelectFromEnd);
        }
    },
    Cursor_Is_Start: function()
    {
        var result = false;

        if( !this.Is_Empty() )
        {
            if(this.CurPos == 0)
                result = this.content[0].Cursor_Is_Start();
        }

        return result;
    },
    Cursor_Is_End: function()
    {
        var result = false;

        if(!this.Is_Empty())
        {
            var len = this.content.length - 1;
            if(this.CurPos == len)
            {
                result = this.content[len].Cursor_Is_End();
            }
        }

        return result;
    },
    //////////////////////////////////////

    /////////////////////////
    //  Text Properties
    ///////////////
    Get_TextPr: function(ContentPos, Depth)
    {
        var pos = ContentPos.Get(Depth);

        var TextPr;

        if(this.IsPlaceholder())
            TextPr = this.Parent.Get_CtrPrp();
        else
            TextPr = this.content[pos].Get_TextPr(ContentPos, Depth + 1);

        return TextPr;
    },
    Get_CompiledTextPr : function(Copy, bAll)
    {
        var TextPr = null;

        if(this.IsPlaceholder())
        {
            TextPr = this.Parent.Get_CompiledCtrPrp_2();
        }
        else if (this.Selection.Use || bAll == true)
        {
            var StartPos, EndPos;
            if(this.Selection.Use)
            {
                StartPos = this.Selection.Start;
                EndPos   = this.Selection.End;

                if ( StartPos > EndPos )
                {
                    StartPos = this.Selection.End;
                    EndPos   = this.Selection.Start;
                }
            }
            else
            {
                StartPos = 0;
                EndPos = this.content.length - 1;
            }

            while ( null === TextPr && StartPos <= EndPos )
            {
                TextPr = this.content[StartPos].Get_CompiledTextPr(true); // true для пустых ранов
                                                                          // т.к. если пустой ран входит в селект, текстовый настройки не скопируются в ране
                StartPos++;
            }

            for ( var CurPos = StartPos; CurPos <= EndPos; CurPos++ )
            {
                var CurTextPr = this.content[CurPos].Get_CompiledPr(true);

                if ( null !== CurTextPr )
                    TextPr = TextPr.Compare( CurTextPr );
            }
        }
        else
        {
            var CurPos = this.CurPos;

            if ( CurPos >= 0 && CurPos < this.content.length )
                TextPr = this.content[CurPos].Get_CompiledTextPr(Copy);
        }

        return TextPr;
    },
    GetMathTextPr: function(ContentPos, Depth)
    {
        var pos = ContentPos.Get(Depth);

        return this.content[pos].GetMathTextPr(ContentPos, Depth + 1);
    },
    Apply_TextPr: function(TextPr, IncFontSize, ApplyToAll)
    {
        if ( true === ApplyToAll )
        {
            for ( var i = 0; i < this.content.length; i++ )
                this.content[i].Apply_TextPr( TextPr, IncFontSize, true );
        }
        else
        {
            var StartPos = this.Selection.Start;
            var EndPos   = this.Selection.End;

            var NewRuns;
            var LRun, CRun, RRun;

            var bSelectOneElement = this.Selection.Use && StartPos == EndPos;

            var FirstPos = this.Selection.Use ? Math.min(StartPos, EndPos) : this.CurPos;

            if(FirstPos == 0)
                this.ParaMath.NeedCompiledCtrPr();

            if( !this.Selection.Use || (bSelectOneElement && this.content[StartPos].Type == para_Math_Run) ) // TextPr меняем только в одном Run
            {
                var Pos = !this.Selection.Use ? this.CurPos :  StartPos;

                NewRuns = this.content[Pos].Apply_TextPr(TextPr, IncFontSize, false);

                LRun = NewRuns[0];
                CRun = NewRuns[1];
                RRun = NewRuns[2];

                var CRunPos = Pos;

                if(LRun !== null)
                {
                    this.Internal_Content_Add(Pos+1, CRun);
                    CRunPos = Pos + 1;
                }

                if(RRun !== null)
                {
                    this.Internal_Content_Add(CRunPos+1, RRun);
                }

                this.CurPos         = CRunPos;
                this.Selection.Start = CRunPos;
                this.Selection.End   = CRunPos;

            }
            else if(bSelectOneElement && this.content[StartPos].Type == para_Math_Composition)
            {
                this.content[StartPos].Apply_TextPr(TextPr, IncFontSize, true);
            }
            else
            {

                if(StartPos > EndPos)
                {
                    var temp = StartPos;
                    StartPos = EndPos;
                    EndPos = temp;
                }


                for(var i = StartPos + 1; i < EndPos; i++)
                    this.content[i].Apply_TextPr(TextPr, IncFontSize, true );


                if(this.content[EndPos].Type == para_Math_Run)
                {
                    NewRuns = this.content[EndPos].Apply_TextPr(TextPr, IncFontSize, false);

                    // LRun - null
                    CRun = NewRuns[1];
                    RRun = NewRuns[2];

                    if(RRun !== null)
                    {
                        this.Internal_Content_Add(EndPos+1, RRun);
                    }

                }
                else
                    this.content[EndPos].Apply_TextPr(TextPr, IncFontSize, true);


                if(this.content[StartPos].Type == para_Math_Run)
                {
                    NewRuns = this.content[StartPos].Apply_TextPr(TextPr, IncFontSize, false);

                    LRun = NewRuns[0];
                    CRun = NewRuns[1];
                    // RRun - null


                    if(LRun !== null)
                    {
                        this.Internal_Content_Add(StartPos+1, CRun);
                    }

                }
                else
                    this.content[StartPos].Apply_TextPr(TextPr, IncFontSize, true);


                var bStartComposition = this.content[StartPos].Type == para_Math_Composition || (this.content[StartPos].Is_Empty() && this.content[StartPos + 1].Type == para_Math_Composition);
                var bEndCompostion    = this.content[EndPos].Type == para_Math_Composition || (this.content[EndPos].Is_Empty()   && this.content[EndPos - 1].Type == para_Math_Composition);

                if(!bStartComposition)
                {
                    if(this.Selection.Start < this.Selection.End && true === this.content[this.Selection.Start].Selection_IsEmpty(true) )
                        this.Selection.Start++;
                    else if (this.Selection.End < this.Selection.Start && true === this.content[this.Selection.End].Selection_IsEmpty(true) )
                        this.Selection.End++;
                }


                if(!bEndCompostion)
                {
                    if(this.Selection.Start < this.Selection.End && true === this.content[this.Selection.End].Selection_IsEmpty(true) )
                        this.Selection.End--;
                    else if (this.Selection.End < this.Selection.Start && true === this.content[this.Selection.Start].Selection_IsEmpty(true) )
                        this.Selection.Start--;
                }

            }
        }

    },
    Set_MathTextPr2: function(TextPr, MathPr, bAll, StartPos, Count)
    {
        if(bAll)
        {
            StartPos = 0;
            Count = this.content.length - 1;
        }

        if(Count < 0 || StartPos + Count > this.content.length - 1)
            return;

        for(var pos = StartPos; pos <= StartPos + Count; pos++)
            this.content[pos].Set_MathTextPr2(TextPr, MathPr, true);

    },
    IsNormalTextInRuns: function()
    {
        var flag = true;

        if(this.Selection.Use)
        {
            var StartPos = this.Selection.Start,
                EndPos   = this.Selection.End;

                if ( StartPos > EndPos )
                {
                    StartPos = this.Selection.End;
                    EndPos   = this.Selection.Start;
                }

            for(var i = StartPos; i < EndPos+1; i++)
            {
                var curr = this.content[i],
                    currType = curr.Type;
                if(currType == para_Math_Composition || (currType == para_Math_Run && false == curr.IsNormalText()))
                {
                    flag = false;
                    break;
                }
            }
        }
        else
            flag = false;

        return flag;
    },
    Internal_Content_Add : function(Pos, Item, bUpdatePosition)
    {
        History.Add( this, { Type : historyitem_Math_AddItem, Pos : Pos, EndPos : Pos, Items : [ Item ] } );
        this.content.splice( Pos, 0, Item );

        if(bUpdatePosition !== false)
        {
            if ( this.CurPos >= Pos )
                this.CurPos++;

            if ( this.Selection.Start >= Pos )
                this.Selection.Start++;

            if ( this.Selection.End >= Pos )
                this.Selection.End++;

            this.private_CorrectSelectionPos();
            this.private_CorrectCurPos();
        }

        // Обновляем позиции в NearestPos
        var NearPosLen = this.NearPosArray.length;
        for ( var Index = 0; Index < NearPosLen; Index++ )
        {
            var HyperNearPos = this.NearPosArray[Index];
            var ContentPos = HyperNearPos.NearPos.ContentPos;
            var Depth      = HyperNearPos.Depth;

            if (ContentPos.Data[Depth] >= Pos)
                ContentPos.Data[Depth]++;
        }
    },
    NeedCompiledCtrPr: function()
    {
        for(var i = 0; i < this.content.length; i++)
            if(this.content[i].Type == para_Math_Composition)
                this.content[i].NeedCompiledCtrPr();

    },
    private_CorrectSelectionPos : function()
    {
        this.Selection.Start = Math.max(0, Math.min(this.content.length - 1, this.Selection.Start));
        this.Selection.End   = Math.max(0, Math.min(this.content.length - 1, this.Selection.End));
    },

    private_CorrectCurPos : function()
    {
        if (this.CurPos > this.content.length - 1)
        {
            this.CurPos = this.content.length - 1;

            if (para_Math_Run === this.content[this.CurPos].Type)
                this.content[this.CurPos].Cursor_MoveToEndPos(false);
        }

        if (this.CurPos < 0)
        {
            this.CurPos = this.content.length - 1;

            if (para_Math_Run === this.content[this.CurPos].Type)
                this.content[this.CurPos].Cursor_MoveToStartPos();
        }
    },

    Add_ToContent : function(Pos, Item)
    {
        this.Internal_Content_Add(Pos, Item);
    },
    Concat_ToContent: function(NewItems)
    {
        var StartPos = this.content.length;
        this.content = this.content.concat( NewItems );

        History.Add( this, { Type : historyitem_Math_AddItem, Pos : StartPos, EndPos : this.content.length - 1, Items : NewItems } );
    },

    Remove_FromContent : function(Pos, Count)
    {
        var DeletedItems = this.content.splice(Pos, Count);
        History.Add( this, { Type : historyitem_Math_RemoveItem, Pos : Pos, EndPos : Pos + Count - 1, Items : DeletedItems } );

        // Обновим текущую позицию
        if (this.CurPos > Pos + Count)
            this.CurPos -= Count;
        else if (this.CurPos > Pos )
            this.CurPos = Pos;

        this.private_CorrectCurPos();

        // Обновим начало и конец селекта
        if (true === this.Selection.Use)
        {
            if (this.Selection.Start <= this.Selection.End)
            {
                if (this.Selection.Start > Pos + Count)
                    this.Selection.Start -= Count;
                else if (this.Selection.Start > Pos)
                    this.Selection.Start = Pos;

                if (this.Selection.End >= Pos + Count)
                    this.Selection.End -= Count;
                else if (this.Selection.End >= Pos)
                    this.Selection.End = Math.max(0, Pos - 1);
            }
            else
            {
                if (this.Selection.Start >= Pos + Count)
                    this.Selection.Start -= Count;
                else if (this.Selection.Start >= Pos)
                    this.Selection.Start = Math.max(0, Pos - 1);

                if (this.Selection.End > Pos + Count)
                    this.Selection.End -= Count;
                else if (this.Selection.End > Pos)
                    this.Selection.End = Pos;
            }
        }

        // Обновляем позиции в NearestPos
        var NearPosLen = this.NearPosArray.length;
        for (var Index = 0; Index < NearPosLen; Index++)
        {
            var HyperNearPos = this.NearPosArray[Index];
            var ContentPos = HyperNearPos.NearPos.ContentPos;
            var Depth      = HyperNearPos.Depth;

            if (ContentPos.Data[Depth] > Pos + Count)
                ContentPos.Data[Depth] -= Count;
            else if (ContentPos.Data[Depth] > Pos)
                ContentPos.Data[Depth] = Math.max(0 , Pos);
        }
    },

    Get_Default_TPrp: function()
    {
        return this.ParaMath.Get_Default_TPrp();
    },

    /////////////////////////
    Is_Empty:    function()
    {
        return this.content.length == 0;
    },

    Copy: function(Selected)
    {
        var NewContent = new CMathContent();
        this.CopyTo(NewContent, Selected);
        return NewContent;
    },

    CopyTo : function(OtherContent, Selected)
    {
        var nStartPos, nEndPos;

        if(true === Selected)
        {
            if(this.Selection.Start < this.Selection.End)
            {
                nStartPos = this.Selection.Start;
                nEndPos   = this.Selection.End;
            }
            else
            {
                nStartPos = this.Selection.End;
                nEndPos   = this.Selection.Start;
            }
        }
        else
        {
            nStartPos = 0;
            nEndPos   = this.content.length - 1;
        }

        OtherContent.plHid = this.plhHide;

        for(var nPos = nStartPos; nPos <= nEndPos; nPos++)
        {
            var oElement;
            if(this.content[nPos].Type == para_Math_Run)
                oElement = this.content[nPos].Copy(Selected);
            else
                oElement = this.content[nPos].Copy(false);

            OtherContent.Internal_Content_Add(OtherContent.content.length, oElement);
        }
    },

    getElem: function(nNum)
    {
        return this.content[nNum];
    },
    Is_FirstComposition: function()
    {
        var result = false;
        if(this.content.length > 1)
        {
            var bEmptyRun = this.content[0].Is_Empty(),
                bMathComp    = this.content[1].Type == para_Math_Composition;

            if(bEmptyRun && bMathComp)
                result = true;
        }

        return result;
    },

    ////////////////////////////////////////////////////////////////

    Undo: function(Data)
    {
        var type = Data.Type;

        switch(type)
        {
            case historyitem_Math_AddItem:
            {
                this.content.splice(Data.Pos, Data.EndPos - Data.Pos + 1);

                if (null !== this.ParaMath)
                    this.ParaMath.SetNeedResize();

                break;
            }
            case historyitem_Math_RemoveItem:
            {
                var Pos = Data.Pos;

                var Array_start = this.content.slice(0, Pos);
                var Array_end   = this.content.slice(Pos);

                this.content = Array_start.concat(Data.Items, Array_end);

                if (null !== this.ParaMath)
                    this.ParaMath.SetNeedResize();

                break;
            }
        }
    },
    Redo: function(Data)
    {
        var type = Data.Type;

        switch(type)
        {
            case historyitem_Math_AddItem:
            {
                var Pos = Data.Pos;

                var Array_start = this.content.slice(0, Pos);
                var Array_end   = this.content.slice(Pos);

                this.content = Array_start.concat(Data.Items, Array_end);

                if (null !== this.ParaMath)
                    this.ParaMath.SetNeedResize();

                break;
            }
            case historyitem_Math_RemoveItem:
            {
                this.content.splice(Data.Pos, Data.EndPos - Data.Pos + 1);

                if (null !== this.ParaMath)
                    this.ParaMath.SetNeedResize();

                break;
            }
        }
    },	
    Save_Changes: function(Data, Writer)
    {
        Writer.WriteLong(historyitem_type_MathContent);

        var Type = Data.Type;
        // Пишем тип
        Writer.WriteLong(Type);

        switch (Type)
        {
            case historyitem_Math_AddItem:
            {
                // Long     : Количество элементов
                // Array of :
                //  {
                //    Long     : Позиция
                //    Variable : Id элемента
                //  }

                var Count = Data.Items.length;

                Writer.WriteLong(Count);

                for (var Index = 0; Index < Count; Index++)
                {
                    Writer.WriteLong(Data.Pos + Index);
                    Writer.WriteString2(Data.Items[Index].Get_Id());
                }

                break;
            }
            case historyitem_Math_RemoveItem:
            {
                // Long          : Количество удаляемых элементов
                // Array of Long : позиции удаляемых элементов

                var Count = Data.Items.length;

                Writer.WriteLong(Count);
                for (var Index = 0; Index < Count; Index++)
                {
                    Writer.WriteLong(Data.Pos);
                }

                break;
            }
        }
    },
    Load_Changes : function(Reader)
    {
        // Сохраняем изменения из тех, которые используются для Undo/Redo в бинарный файл.
        // Long : тип класса
        // Long : тип изменений

        var ClassType = Reader.GetLong();
        if ( historyitem_type_MathContent != ClassType )
            return;

        var Type = Reader.GetLong();

        switch ( Type )
        {
            case  historyitem_Math_AddItem:
            {
                // Long     : Количество элементов
                // Array of :
                //  {
                //    Long     : Позиция
                //    Variable : Id Элемента
                //  }

                var Count = Reader.GetLong();

                for ( var Index = 0; Index < Count; Index++ )
                {
                    var Pos     = Reader.GetLong();
                    var Element = g_oTableId.Get_ById( Reader.GetString2() );

                    if ( null != Element )
                        this.content.splice(Pos, 0, Element);
                }

                this.private_SetNeedResize();

                break;
            }
			case historyitem_Math_RemoveItem:
            {
                // Long          : Количество удаляемых элементов
                // Array of Long : позиции удаляемых элементов

                var Count = Reader.GetLong();

                for ( var Index = 0; Index < Count; Index++ )
                {
                    var ChangesPos = Reader.GetLong();
                    this.content.splice(ChangesPos, 1);
                }

                this.private_SetNeedResize();

                break;
            }
        }
    },
    Write_ToBinary2 : function(Writer)
    {
        Writer.WriteLong(historyitem_type_MathContent);

        // Long : Id
        Writer.WriteString2(this.Id);
    },
    Read_FromBinary2 : function(Reader)
    {
        // Long : Id
        this.Id = Reader.GetString2();
    },
    Refresh_RecalcData: function()
    {
        if(this.ParaMath !== null)
            this.ParaMath.Refresh_RecalcData(); // Refresh_RecalcData сообщает родительскому классу, что у него произошли изменения, нужно пересчитать
    },

    Insert_MathContent : function(oMathContent, Pos, bSelect)
    {
        if (null === this.ParaMath || null === this.ParaMath.Paragraph)
            bSelect = false;

        if (undefined === Pos)
            Pos = this.CurPos;

        var nCount = oMathContent.content.length;
        for (var nIndex = 0; nIndex < nCount; nIndex++)
        {
            this.Internal_Content_Add(Pos + nIndex, oMathContent.content[nIndex], false);

            if (true === bSelect)
            {
                oMathContent.content[nIndex].Select_All();
            }
        }

        if (null !== this.ParaMath)
            this.ParaMath.SetNeedResize();

        this.CurPos = Pos + nCount;

        if (true === bSelect)
        {
            this.Selection.Use = true;
            this.Selection.Start = Pos;
            this.Selection.End   = Pos + nCount - 1;

            if (!this.bRoot)
                this.ParentElement.Select_MathContent(this);
            else
                this.ParaMath.bSelectionUse = true;

            this.ParaMath.Paragraph.Select_Math(this.ParaMath);
        }

        this.Correct_Content(true);
        this.Correct_ContentPos(-1);
    },

	Load_FromMenu: function(Type, Paragraph)
	{
		var oFName;
		this.Paragraph = Paragraph;
		var props = {ctrPrp: new CTextPr()};
		switch (Type)
		{
			case 1: 	var oFraction = new CFraction(props);						
						this.CreateFraction(oFraction, this, null, null);
						break;
			case 2: 	props = {ctrPrp: new CTextPr(), type:SKEWED_FRACTION};
						var oFraction = new CFraction(props);
						this.CreateFraction(oFraction, this, null, null);
						break;
			case 3: 	props = {ctrPrp: new CTextPr(), type:LINEAR_FRACTION};
						var oFraction = new CFraction(props);
						this.CreateFraction(oFraction, this, null, null);
						break;
			case 4: 	var oBox = new CBox(props);
						this.CreateElem(oBox, this)
						
						var oElem = oBox.getBase();
						//здесь выставляем для oElem argPr.argSz=-1; этой обертки нет
						var oFraction = new CFraction(props);
						this.CreateFraction(oFraction, oElem, null, null);
						break;
			case 5: 	var oFraction = new CFraction(props);
						var sNum = "dx";
						var sDen = "dy";
						this.CreateFraction(oFraction,this, sNum, sDen);
						break;
			case 6: 	var sNum = String.fromCharCode(916) + "y";
						var sDen = String.fromCharCode(916) + "x";
						var oFraction = new CFraction(props);
						this.CreateFraction(oFraction, this, sNum, sDen);
						break;
			case 7: 	var sNum = String.fromCharCode(8706) + "y";
						var sDen = String.fromCharCode(8706) + "x";
						var oFraction = new CFraction(props);
						this.CreateFraction(oFraction, this, sNum, sDen);
						break;
			case 8: 	var sNum = String.fromCharCode(948) + "y";
						var sDen = String.fromCharCode(948) + "x";
						var oFraction = new CFraction(props);
						this.CreateFraction(oFraction, this, sNum, sDen);
						break;
			case 9: 	var sNum = String.fromCharCode(960);
						var sDen = "2";
						var oFraction = new CFraction(props);
						this.CreateFraction(oFraction, this, sNum, sDen);
						break;
			case 10:	props = {ctrPrp: new CTextPr(), type:DEGREE_SUPERSCRIPT};
						var oDegree = new CDegree(props);
						this.CreateDegree(oDegree, this, null, null, null);
						break;
			case 11:	props = {ctrPrp: new CTextPr(), type:DEGREE_SUBSCRIPT};
						var oDegree = new CDegree(props);
						this.CreateDegree(oDegree, this, null, null, null);
						break;
			case 12:	props = {ctrPrp: new CTextPr(), type:DEGREE_SubSup};
						var oDegree = new CDegreeSubSup(props);
						this.CreateDegree(oDegree, this, null, null, null);
						var oSub = oDegree.getLowerIterator();
						var oSup = oDegree.getUpperIterator();
						var oElem = oDegree.getBase();
						break;
			case 13:	props = {ctrPrp: new CTextPr(), type:DEGREE_PreSubSup};
						var oDegree = new CDegreeSubSup(props);
						this.CreateDegree(oDegree, this, null, null, null);
						var oSub = oDegree.getLowerIterator();
						var oSup = oDegree.getUpperIterator();
						var oElem = oDegree.getBase();
						break;
			case 14:	props = {ctrPrp: new CTextPr(), type:DEGREE_SUBSCRIPT};			
						var oDegree = new CDegree(props);
						this.CreateElem(oDegree, this)
						
						var oElem = oDegree.getBase();
						this.AddText(oElem, "x");						
						var oSub = oDegree.getLowerIterator();						
						props = {ctrPrp: new CTextPr(), type:DEGREE_SUPERSCRIPT};	
						var sBase = "y"
						var sSup = "2"						
						var oDegree1 = new CDegree(props);
						this.CreateDegree(oDegree1, oSub, sBase, sSup, null);
						break;
			case 15:	props = {ctrPrp: new CTextPr(), type:DEGREE_SUPERSCRIPT};
						var sBase = "e";
						var sSup = "-i" + String.fromCharCode(969) + "t";						
						var oDegree = new CDegree(props);
						this.CreateDegree(oDegree, this, sBase, sSup, null);
						break;
			case 16:	props = {ctrPrp: new CTextPr(), type:DEGREE_SUPERSCRIPT};
						var sBase = "x";
						var sSup = "2";
						var oDegree = new CDegree(props);
						this.CreateDegree(oDegree, this, sBase, sSup, null);
						break;
			case 17:	props = {ctrPrp: new CTextPr(), type:DEGREE_PreSubSup};
						var sBase = "Y";
						var sSup = "n";
						var sSub = "1";						
						var oDegreeSubSup = new CDegreeSubSup(props);
						this.CreateDegree(oDegreeSubSup, this, sBase, sSup, sSub);
						break;
			case 18:	props = {ctrPrp: new CTextPr(), type:SQUARE_RADICAL, degHide:true};					
						var oRadical = new CRadical(props);
						this.CreateRadical(oRadical, this, null, null);
						break;
			case 19:	props = {ctrPrp: new CTextPr(), type:DEGREE_RADICAL};					
						var oRadical = new CRadical(props);
						this.CreateRadical(oRadical, this, null, null);
						break;
			case 20:	props = {ctrPrp: new CTextPr(), type:DEGREE_RADICAL};
						var sDeg = "2";						
						var oRadical = new CRadical(props);
						this.CreateRadical(oRadical, this, null, sDeg);
						var oElem = oRadical.getBase();
						break;
			case 21:	props = {ctrPrp: new CTextPr(), type:DEGREE_RADICAL};
						var sDeg = "3";						
						var oRadical = new CRadical(props);
						this.CreateRadical(oRadical, this, null, sDeg);
						var oElem = oRadical.getBase();
						break;
			case 22:	var oFraction = new CFraction(props);						
						this.CreateElem(oFraction, this);
						
						var oElemNum = oFraction.getNumerator();
						var sText = "-b" + String.fromCharCode(177);
						this.AddText(oElemNum, sText);
						
						props = {ctrPrp: new CTextPr(), type:DEGREE_RADICAL, degHide:true};
						var oRadical = new CRadical(props);
						this.CreateElem(oRadical, oElemNum);						
						var oElem = oRadical.getBase();
						
						props = {ctrPrp: new CTextPr(), type:DEGREE_SUPERSCRIPT};
						var oDegree = new CDegree(props);
						this.CreateElem(oDegree, oElem);						
						var oDegElem = oDegree.getBase();
						this.AddText(oDegElem, "b");
						var oDegSup = oDegree.getUpperIterator();
						this.AddText(oDegSup, "2");
						
						this.AddText(oElem, "-4ac");					
						
						var oElemDen = oFraction.getDenominator();
						this.AddText(oElemDen, "2a");												
						break;
			case 23:	props = {ctrPrp: new CTextPr(), type:SQUARE_RADICAL, degHide:true};
						var oRadical = new CRadical(props);
						this.CreateElem(oRadical, this);
						
						var oElem = oRadical.getBase();
						props = {ctrPrp: new CTextPr(), type:DEGREE_SUPERSCRIPT};
						var sBase = "a";
						var sSup = "2";
						var oDegree1 = new CDegree(props);
						this.CreateDegree(oDegree1, oElem, sBase, sSup, null);
						
						this.AddText(oElem, "+");
						
						props = {ctrPrp: new CTextPr(), type:DEGREE_SUPERSCRIPT};
						sBase = "b";
						sSup = "2";
						var oDegree2 = new CDegree(props);
						this.CreateDegree(oDegree2, oElem, sBase, sSup, null);						
						break;
			case 24:	props = {ctrPrp: new CTextPr(), limLoc:NARY_UndOvr, subHide:true, supHide:true};
						var oNary = new CNary(props);
						this.CreateNary(oNary,this,null,null,null);
						var oElem = oNary.getBase();
						break;
			case 25:	props = {ctrPrp: new CTextPr(), limLoc:NARY_SubSup};
						var oNary = new CNary(props);
						this.CreateNary(oNary,this,null,null,null);
						var oElem = oNary.getBase();
						var oSub = oNary.getLowerIterator();
						var oSup = oNary.getUpperIterator();
						break;
			case 26:	props = {ctrPrp: new CTextPr(), limLoc:NARY_UndOvr};
						var oNary = new CNary(props);
						this.CreateNary(oNary,this,null,null,null);
						var oElem = oNary.getBase();
						var oSub = oNary.getLowerIterator();
						var oSup = oNary.getUpperIterator();
						break;
			case 27:	props = {ctrPrp: new CTextPr(), limLoc:NARY_UndOvr, subHide:true, supHide:true, chr:8748};
						var oNary = new CNary(props);
						this.CreateNary(oNary,this,null,null,null);
						var oElem = oNary.getBase();
						break;
			case 28:	props = {ctrPrp: new CTextPr(), limLoc:NARY_SubSup, chr:8748};
						var oNary = new CNary(props);
						this.CreateNary(oNary,this,null,null,null);
						var oElem = oNary.getBase();
						var oSub = oNary.getLowerIterator();
						var oSup = oNary.getUpperIterator();
						break;
			case 29:	props = {ctrPrp: new CTextPr(), limLoc:NARY_UndOvr, chr:8748};
						var oNary = new CNary(props);
						this.CreateNary(oNary,this,null,null,null);
						var oElem = oNary.getBase();
						var oSub = oNary.getLowerIterator();
						var oSup = oNary.getUpperIterator();
						break;
			case 30:	props = {ctrPrp: new CTextPr(), limLoc:NARY_UndOvr, subHide:true, supHide:true, chr:8749};
						var oNary = new CNary(props);
						this.CreateNary(oNary,this,null,null,null);
						var oElem = oNary.getBase();
						break;
			case 31:	props = {ctrPrp: new CTextPr(), limLoc:NARY_SubSup, chr:8749};
						var oNary = new CNary(props);
						this.CreateNary(oNary,this,null,null,null);
						var oElem = oNary.getBase();
						var oSub = oNary.getLowerIterator();
						var oSup = oNary.getUpperIterator();
						break;
			case 32:	props = {ctrPrp: new CTextPr(), limLoc:NARY_UndOvr, chr:8749};
						var oNary = new CNary(props);
						this.CreateNary(oNary,this,null,null,null);
						var oElem = oNary.getBase();
						var oSub = oNary.getLowerIterator();
						var oSup = oNary.getUpperIterator();
						break;
			case 33:	props = {ctrPrp: new CTextPr(), limLoc:NARY_UndOvr, subHide:true, supHide:true, chr:8750};
						var oNary = new CNary(props);
						this.CreateNary(oNary,this,null,null,null);
						var oElem = oNary.getBase();
						break;
			case 34:	props = {ctrPrp: new CTextPr(), limLoc:NARY_SubSup, chr:8750};
						var oNary = new CNary(props);
						this.CreateNary(oNary,this,null,null,null);
						var oElem = oNary.getBase();
						var oSub = oNary.getLowerIterator();
						var oSup = oNary.getUpperIterator();
						break;
			case 35:	props = {ctrPrp: new CTextPr(), limLoc:NARY_UndOvr, chr:8750};
						var oNary = new CNary(props);
						this.CreateNary(oNary,this,null,null,null);
						var oElem = oNary.getBase();
						var oSub = oNary.getLowerIterator();
						var oSup = oNary.getUpperIterator();
						break;
			case 36:	props = {ctrPrp: new CTextPr(), limLoc:NARY_UndOvr, subHide:true, supHide:true, chr:8751};
						var oNary = new CNary(props);
						this.CreateNary(oNary,this,null,null,null);
						var oElem = oNary.getBase();
						break;
			case 37:	props = {ctrPrp: new CTextPr(), limLoc:NARY_SubSup, chr:8751};
						var oNary = new CNary(props);
						this.CreateNary(oNary,this,null,null,null);
						var oElem = oNary.getBase();
						var oSub = oNary.getLowerIterator();
						var oSup = oNary.getUpperIterator();
						break;
			case 38:	props = {ctrPrp: new CTextPr(), limLoc:NARY_UndOvr, chr:8751};
						var oNary = new CNary(props);
						this.CreateNary(oNary,this,null,null,null);
						var oElem = oNary.getBase();
						var oSub = oNary.getLowerIterator();
						var oSup = oNary.getUpperIterator();
						break;
			case 39:	props = {ctrPrp: new CTextPr(), limLoc:NARY_UndOvr, subHide:true, supHide:true, chr:8752};
						var oNary = new CNary(props);
						this.CreateNary(oNary,this,null,null,null);
						var oElem = oNary.getBase();
						break;
			case 40:	props = {ctrPrp: new CTextPr(), limLoc:NARY_SubSup, chr:8752};
						var oNary = new CNary(props);
						this.CreateNary(oNary,this,null,null,null);
						var oElem = oNary.getBase();
						var oSub = oNary.getLowerIterator();
						var oSup = oNary.getUpperIterator();
						break;
			case 41:	props = {ctrPrp: new CTextPr(), limLoc:NARY_UndOvr, chr:8752};
						var oNary = new CNary(props);
						this.CreateNary(oNary,this,null,null,null);
						var oElem = oNary.getBase();
						var oSub = oNary.getLowerIterator();
						var oSup = oNary.getUpperIterator();
						break;
			case 42:	props = {ctrPrp: new CTextPr(), diff:1};
						var sVal = "dx";
						var oBox = new CBox(props);
						this.CreateBox(oBox,this,sVal);
						break;
			case 43:	props = {ctrPrp: new CTextPr(), diff:1};
						var sVal = "dy";
						var oBox = new CBox(props);
						this.CreateBox(oBox,this,sVal);
						break;
			case 44:	props = {ctrPrp: new CTextPr(), diff:1};
						var sVal = "d" + String.fromCharCode(952);
						var oBox = new CBox(props);
						this.CreateBox(oBox,this,sVal);
						break;
			case 45:	props = {ctrPrp: new CTextPr(), chr:8721, limLoc:NARY_UndOvr, subHide:true, supHide:true};
						var oNary = new CNary(props);
						this.CreateNary(oNary,this,null,null,null);
						var oElem = oNary.getBase();
						break;
			case 46:	props = {ctrPrp: new CTextPr(), chr:8721, limLoc:NARY_UndOvr};
						var oNary = new CNary(props);
						this.CreateNary(oNary,this,null,null,null);
						var oElem = oNary.getBase();
						var oSub = oNary.getLowerIterator();
						var oSup = oNary.getUpperIterator();
						break;
			case 47:	props = {ctrPrp: new CTextPr(), chr:8721, limLoc:NARY_SubSup};
						var oNary = new CNary(props);
						this.CreateNary(oNary,this,null,null,null);
						var oElem = oNary.getBase();
						var oSub = oNary.getLowerIterator();
						var oSup = oNary.getUpperIterator();
						break;
			case 48:	props = {ctrPrp: new CTextPr(), chr:8721, limLoc:NARY_UndOvr, supHide:true};
						var oNary = new CNary(props);
						this.CreateNary(oNary,this,null,null,null);
						var oElem = oNary.getBase();
						var oSub = oNary.getLowerIterator();
						break;
			case 49:	props = {ctrPrp: new CTextPr(), chr:8721, limLoc:NARY_SubSup, supHide:true};
						var oNary = new CNary(props);
						this.CreateNary(oNary,this,null,null,null);
						var oElem = oNary.getBase();
						var oSub = oNary.getLowerIterator();
						break;
			case 50:	props = {ctrPrp: new CTextPr(), chr:8719, limLoc:NARY_UndOvr, subHide:true, supHide:true};
						var oNary = new CNary(props);
						this.CreateNary(oNary,this,null,null,null);
						var oElem = oNary.getBase();
						break;
			case 51:	props = {ctrPrp: new CTextPr(), chr:8719, limLoc:NARY_UndOvr};
						var oNary = new CNary(props);
						this.CreateNary(oNary,this,null,null,null);
						var oElem = oNary.getBase();
						var oSub = oNary.getLowerIterator();
						var oSup = oNary.getUpperIterator();
						break;
			case 52:	props = {ctrPrp: new CTextPr(), chr:8719, limLoc:NARY_SubSup};
						var oNary = new CNary(props);
						this.CreateNary(oNary,this,null,null,null);
						var oElem = oNary.getBase();
						var oSub = oNary.getLowerIterator();
						var oSup = oNary.getUpperIterator();
						break;
			case 53:	props = {ctrPrp: new CTextPr(), chr:8719, limLoc:NARY_UndOvr, supHide:true};
						var oNary = new CNary(props);
						this.CreateNary(oNary,this,null,null,null);
						var oElem = oNary.getBase();
						var oSub = oNary.getLowerIterator();
						break;
			case 54:	props = {ctrPrp: new CTextPr(), chr:8719, limLoc:NARY_SubSup, supHide:true};
						var oNary = new CNary(props);
						this.CreateNary(oNary,this,null,null,null);
						var oElem = oNary.getBase();
						var oSub = oNary.getLowerIterator();
						break;
			case 55:	props = {ctrPrp: new CTextPr(), chr:8720, limLoc:NARY_UndOvr, subHide:true, supHide:true};
						var oNary = new CNary(props);
						this.CreateNary(oNary,this,null,null,null);
						var oElem = oNary.getBase();
						break;
			case 56:	props = {ctrPrp: new CTextPr(), chr:8720, limLoc:NARY_UndOvr};
						var oNary = new CNary(props);
						this.CreateNary(oNary,this,null,null,null);
						var oElem = oNary.getBase();
						var oSub = oNary.getLowerIterator();
						var oSup = oNary.getUpperIterator();
						break;
			case 57:	props = {ctrPrp: new CTextPr(), chr:8720, limLoc:NARY_SubSup};
						var oNary = new CNary(props);
						this.CreateNary(oNary,this,null,null,null);
						var oElem = oNary.getBase();
						var oSub = oNary.getLowerIterator();
						var oSup = oNary.getUpperIterator();
						break;
			case 58:	props = {ctrPrp: new CTextPr(), chr:8720, limLoc:NARY_UndOvr, supHide:true};
						var oNary = new CNary(props);
						this.CreateNary(oNary,this,null,null,null);
						var oElem = oNary.getBase();
						var oSub = oNary.getLowerIterator();
						break;
			case 59:	props = {ctrPrp: new CTextPr(), chr:8720, limLoc:NARY_SubSup, supHide:true};
						var oNary = new CNary(props);
						this.CreateNary(oNary,this,null,null,null);
						var oElem = oNary.getBase();
						var oSub = oNary.getLowerIterator();
						break;
			case 60:	props = {ctrPrp: new CTextPr(), chr:8899, limLoc:NARY_UndOvr, subHide:true, supHide:true};
						var oNary = new CNary(props);
						this.CreateNary(oNary,this,null,null,null);
						var oElem = oNary.getBase();
						break;
			case 61:	props = {ctrPrp: new CTextPr(), chr:8899, limLoc:NARY_UndOvr};
						var oNary = new CNary(props);
						this.CreateNary(oNary,this,null,null,null);
						var oElem = oNary.getBase();
						var oSub = oNary.getLowerIterator();
						var oSup = oNary.getUpperIterator();
						break;
			case 62:	props = {ctrPrp: new CTextPr(), chr:8899, limLoc:NARY_SubSup};
						var oNary = new CNary(props);
						this.CreateNary(oNary,this,null,null,null);
						var oElem = oNary.getBase();
						var oSub = oNary.getLowerIterator();
						var oSup = oNary.getUpperIterator();
						break;
			case 63:	props = {ctrPrp: new CTextPr(), chr:8899, limLoc:NARY_UndOvr, supHide:true};
						var oNary = new CNary(props);
						this.CreateNary(oNary,this,null,null,null);
						var oElem = oNary.getBase();
						var oSub = oNary.getLowerIterator();
						break;
			case 64:	props = {ctrPrp: new CTextPr(), chr:8899, limLoc:NARY_SubSup, supHide:true};
						var oNary = new CNary(props);
						this.CreateNary(oNary,this,null,null,null);
						var oElem = oNary.getBase();
						var oSub = oNary.getLowerIterator();
						break;
			case 65:	props = {ctrPrp: new CTextPr(), chr:8898, limLoc:NARY_UndOvr, subHide:true, supHide:true};
						var oNary = new CNary(props);
						this.CreateNary(oNary,this,null,null,null);
						var oElem = oNary.getBase();
						break;
			case 66:	props = {ctrPrp: new CTextPr(), chr:8898, limLoc:NARY_UndOvr};
						var oNary = new CNary(props);
						this.CreateNary(oNary,this,null,null,null);
						var oElem = oNary.getBase();
						var oSub = oNary.getLowerIterator();
						var oSup = oNary.getUpperIterator();
						break;
			case 67:	props = {ctrPrp: new CTextPr(), chr:8898, limLoc:NARY_SubSup};
						var oNary = new CNary(props);
						this.CreateNary(oNary,this,null,null,null);
						var oElem = oNary.getBase();
						var oSub = oNary.getLowerIterator();
						var oSup = oNary.getUpperIterator();
						break;
			case 68:	props = {ctrPrp: new CTextPr(), chr:8898, limLoc:NARY_UndOvr, supHide:true};
						var oNary = new CNary(props);
						this.CreateNary(oNary,this,null,null,null);
						var oElem = oNary.getBase();
						var oSub = oNary.getLowerIterator();
						break;
			case 69:	props = {ctrPrp: new CTextPr(), chr:8898, limLoc:NARY_SubSup, supHide:true};
						var oNary = new CNary(props);
						this.CreateNary(oNary,this,null,null,null);
						var oElem = oNary.getBase();
						var oSub = oNary.getLowerIterator();
						break;
			case 70:	props = {ctrPrp: new CTextPr(), chr:8897, limLoc:NARY_UndOvr, subHide:true, supHide:true};
						var oNary = new CNary(props);
						this.CreateNary(oNary,this,null,null,null);
						var oElem = oNary.getBase();
						break;
			case 71:	props = {ctrPrp: new CTextPr(), chr:8897, limLoc:NARY_UndOvr};
						var oNary = new CNary(props);
						this.CreateNary(oNary,this,null,null,null);
						var oElem = oNary.getBase();
						var oSub = oNary.getLowerIterator();
						var oSup = oNary.getUpperIterator();
						break;
			case 72:	props = {ctrPrp: new CTextPr(), chr:8897, limLoc:NARY_SubSup};
						var oNary = new CNary(props);
						this.CreateNary(oNary,this,null,null,null);
						var oElem = oNary.getBase();
						var oSub = oNary.getLowerIterator();
						var oSup = oNary.getUpperIterator();
						break;
			case 73:	props = {ctrPrp: new CTextPr(), chr:8897, limLoc:NARY_UndOvr, supHide:true};
						var oNary = new CNary(props);
						this.CreateNary(oNary,this,null,null,null);
						var oElem = oNary.getBase();
						var oSub = oNary.getLowerIterator();
						break;
			case 74:	props = {ctrPrp: new CTextPr(), chr:8897, limLoc:NARY_SubSup, supHide:true};
						var oNary = new CNary(props);
						this.CreateNary(oNary,this,null,null,null);
						var oElem = oNary.getBase();
						var oSub = oNary.getLowerIterator();
						break;
			case 75:	props = {ctrPrp: new CTextPr(), chr:8896, limLoc:NARY_UndOvr, subHide:true, supHide:true};
						var oNary = new CNary(props);
						this.CreateNary(oNary,this,null,null,null);
						var oElem = oNary.getBase();
						break;
			case 76:	props = {ctrPrp: new CTextPr(), chr:8896, limLoc:NARY_UndOvr};
						var oNary = new CNary(props);
						this.CreateNary(oNary,this,null,null,null);
						var oElem = oNary.getBase();
						var oSub = oNary.getLowerIterator();
						var oSup = oNary.getUpperIterator();
						break;
			case 77:	props = {ctrPrp: new CTextPr(), chr:8896, limLoc:NARY_SubSup};
						var oNary = new CNary(props);
						this.CreateNary(oNary,this,null,null,null);
						var oElem = oNary.getBase();
						var oSub = oNary.getLowerIterator();
						var oSup = oNary.getUpperIterator();
						break;
			case 78:	props = {ctrPrp: new CTextPr(), chr:8896, limLoc:NARY_UndOvr, supHide:true};
						var oNary = new CNary(props);
						this.CreateNary(oNary,this,null,null,null);
						var oElem = oNary.getBase();
						var oSub = oNary.getLowerIterator();
						break;
			case 79:	props = {ctrPrp: new CTextPr(), chr:8896, limLoc:NARY_SubSup, supHide:true};
						var oNary = new CNary(props);
						this.CreateNary(oNary,this,null,null,null);
						var oElem = oNary.getBase();
						var oSub = oNary.getLowerIterator();
						break;
			case 80:	props = {ctrPrp: new CTextPr(), chr:8721, supHide:true};
						var oNary = new CNary(props);
						this.CreateElem(oNary,this);
						var narySub = oNary.getLowerIterator();
						this.AddText(narySub, "k");
						var naryBase = oNary.getBase();
						
						props = {ctrPrp: new CTextPr(), column:1};
						var oDelimiter = new CDelimiter(props);
						this.CreateElem(oDelimiter,naryBase);
						var delimiterBase = oDelimiter.getBase(0);
						
						props = {ctrPrp: new CTextPr(), type:NO_BAR_FRACTION};
						var oFraction = new CFraction(props);
						this.CreateFraction(oFraction, delimiterBase, "n", "k");
						break
			case 81:	props = {ctrPrp: new CTextPr(), chr:8721};
						var oNary = new CNary(props);
						this.CreateNary(oNary,this,null,"i=0","n");
						var oElem = oNary.getBase();
						break;
			case 82:	props = {ctrPrp: new CTextPr(), chr:8721, supHide:true};
						var oNary = new CNary(props);
						this.CreateElem(oNary,this);
						var narySub = oNary.getLowerIterator();
						
						props = {ctrPrp: new CTextPr(), row:2};
						var oEqArr = new CEqArray(props);
						this.CreateElem(oEqArr, narySub);
						var eqarrElem0 = oEqArr.getElement(0);
						this.AddText(eqarrElem0, "0≤ i ≤ m");
						var eqarrElem1 = oEqArr.getElement(1);
						this.AddText(eqarrElem1, "0< j < n");

						var naryBase = oNary.getBase();
						this.AddText(naryBase, "P");
						
						props = {ctrPrp: new CTextPr(), column:1};
						var oDelimiter = new CDelimiter(props);
						this.CreateElem(oDelimiter,naryBase);
						var delimiterBase = oDelimiter.getBase(0);
						this.AddText(delimiterBase, "i,j");
						break;						
			case 83:	props = {ctrPrp: new CTextPr(), chr:8719};
						var oNary = new CNary(props);
						this.CreateElem(oNary, this);
						var narySup = oNary.getUpperIterator();
						this.AddText(narySup, "n");
						var narySub = oNary.getLowerIterator();
						this.AddText(narySub, "k=1");
						var naryBase = oNary.getBase();
						
						props = {ctrPrp: new CTextPr(), type:DEGREE_SUBSCRIPT};
						var oSSub = new CDegree(props);
						this.CreateDegree(oSSub, naryBase, "A", null, "k");
						break;
			case 84:	props = {ctrPrp: new CTextPr(), chr:8899};
						var oNary = new CNary(props);
						this.CreateElem(oNary,this);
						
						var narySub = oNary.getLowerIterator();
						this.AddText(narySub, "n=1");
						var narySup = oNary.getUpperIterator();
						this.AddText(narySup, "m");
						var naryBase = oNary.getBase();
						
						props = {ctrPrp: new CTextPr(), column:1};
						var oDelimiter = new CDelimiter(props);
						this.CreateElem(oDelimiter,naryBase);
						var delimiterBase = oDelimiter.getBase(0);
						
						props = {ctrPrp: new CTextPr(), type:DEGREE_SUBSCRIPT};
						var oSSub0 = new CDegree(props);
						this.CreateDegree(oSSub0, delimiterBase, "X", null, "n"); 
						
						var sChar = String.fromCharCode(8898);
						this.AddText(delimiterBase, sChar);
						
						props = {ctrPrp: new CTextPr(), type:DEGREE_SUBSCRIPT};
						var oSSub1 = new CDegree(props);
						this.CreateDegree(oSSub1, delimiterBase, "Y", null, "n"); 					
						break;
			case 85:	props = {ctrPrp: new CTextPr(), column:1};
						var oDelimiter = new CDelimiter(props);
						this.CreateElem(oDelimiter,this);
						break;
			case 86:	props = {ctrPrp: new CTextPr(), column:1, begChr:91, endChr:93};
						var oDelimiter = new CDelimiter(props);
						this.CreateElem(oDelimiter,this);
						break;
			case 87:	props = {ctrPrp: new CTextPr(), column:1, begChr:123, endChr:125};
						var oDelimiter = new CDelimiter(props);
						this.CreateElem(oDelimiter,this);
						break;
			case 88:	props = {ctrPrp: new CTextPr(), column:1, begChr:10216, endChr:10217};
						var oDelimiter = new CDelimiter(props);
						this.CreateElem(oDelimiter,this);
						break;
			case 89:	props = {ctrPrp: new CTextPr(), column:1, begChr:9123, endChr:9126};
						var oDelimiter = new CDelimiter(props);
						this.CreateElem(oDelimiter,this);
						break;
			case 90:	props = {ctrPrp: new CTextPr(), column:1, begChr:9121, endChr:9124};
						var oDelimiter = new CDelimiter(props);
						this.CreateElem(oDelimiter,this);
						break;
			case 91:	props = {ctrPrp: new CTextPr(), column:1, begChr:124, endChr:124};
						var oDelimiter = new CDelimiter(props);
						this.CreateElem(oDelimiter,this);
						break;
			case 92:	props = {ctrPrp: new CTextPr(), column:1, begChr:8214, endChr:8214};
						var oDelimiter = new CDelimiter(props);
						this.CreateElem(oDelimiter,this);
						break;
			case 93:	props = {ctrPrp: new CTextPr(), column:1, begChr:91, endChr:91};
						var oDelimiter = new CDelimiter(props);
						this.CreateElem(oDelimiter,this);
						break;
			case 94:	props = {ctrPrp: new CTextPr(), column:1, begChr:93, endChr:93};
						var oDelimiter = new CDelimiter(props);
						this.CreateElem(oDelimiter,this);
						break;
			case 95:	props = {ctrPrp: new CTextPr(), column:1, begChr:93, endChr:91};
						var oDelimiter = new CDelimiter(props);
						this.CreateElem(oDelimiter,this);
						break;
			case 96:	props = {ctrPrp: new CTextPr(), column:1, begChr:10214, endChr:10215};
						var oDelimiter = new CDelimiter(props);
						this.CreateElem(oDelimiter,this);
						break;
			case 97:	props = {ctrPrp: new CTextPr(), column:2};
						var oDelimiter = new CDelimiter(props);
						this.CreateElem(oDelimiter,this);
						break;
			case 98:	props = {ctrPrp: new CTextPr(), column:2, begChr:123, endChr:125};
						var oDelimiter = new CDelimiter(props);
						this.CreateElem(oDelimiter,this);
						break;
			case 99:	props = {ctrPrp: new CTextPr(), column:2, begChr:10216, endChr:10217};
						var oDelimiter = new CDelimiter(props);
						this.CreateElem(oDelimiter,this);
						break;
			case 100:	props = {ctrPrp: new CTextPr(), column:3, begChr:10216, endChr:10217};
						var oDelimiter = new CDelimiter(props);
						this.CreateElem(oDelimiter,this);
						break;
			case 101:	props = {ctrPrp: new CTextPr(), column:1, endChr:-1};
						var oDelimiter = new CDelimiter(props);
						this.CreateElem(oDelimiter,this);
						break;
			case 102:	props = {ctrPrp: new CTextPr(), column:1, begChr:-1};
						var oDelimiter = new CDelimiter(props);
						this.CreateElem(oDelimiter,this);
						break;
			case 103:	props = {ctrPrp: new CTextPr(), column:1, begChr:91, endChr:-1};
						var oDelimiter = new CDelimiter(props);
						this.CreateElem(oDelimiter,this);
						break;
			case 104:	props = {ctrPrp: new CTextPr(), column:1, begChr:-1, endChr:93};
						var oDelimiter = new CDelimiter(props);
						this.CreateElem(oDelimiter,this);
						break;
			case 105:	props = {ctrPrp: new CTextPr(), column:1, begChr:123, endChr:-1};
						var oDelimiter = new CDelimiter(props);
						this.CreateElem(oDelimiter,this);
						break;
			case 106:	props = {ctrPrp: new CTextPr(), column:1, begChr:-1, endChr:125};
						var oDelimiter = new CDelimiter(props);
						this.CreateElem(oDelimiter,this);
						break;
			case 107:	props = {ctrPrp: new CTextPr(), column:1, begChr:10216, endChr:-1};
						var oDelimiter = new CDelimiter(props);
						this.CreateElem(oDelimiter,this);
						break;
			case 108:	props = {ctrPrp: new CTextPr(), column:1, begChr:-1, endChr:10217};
						var oDelimiter = new CDelimiter(props);
						this.CreateElem(oDelimiter,this);
						break;
			case 109:	props = {ctrPrp: new CTextPr(), column:1, begChr:9123, endChr:-1};
						var oDelimiter = new CDelimiter(props);
						this.CreateElem(oDelimiter,this);
						break;
			case 110:	props = {ctrPrp: new CTextPr(), column:1, begChr:-1, endChr:9126};
						var oDelimiter = new CDelimiter(props);
						this.CreateElem(oDelimiter,this);
						break;
			case 111:	props = {ctrPrp: new CTextPr(), column:1, begChr:9121, endChr:-1};
						var oDelimiter = new CDelimiter(props);
						this.CreateElem(oDelimiter,this);
						break;
			case 112:	props = {ctrPrp: new CTextPr(), column:1, begChr:-1, endChr:9124};
						var oDelimiter = new CDelimiter(props);
						this.CreateElem(oDelimiter,this);
						break;
			case 113:	props = {ctrPrp: new CTextPr(), column:1, begChr:124, endChr:-1};
						var oDelimiter = new CDelimiter(props);
						this.CreateElem(oDelimiter,this);
						break;
			case 114:	props = {ctrPrp: new CTextPr(), column:1, begChr:-1, endChr:124};
						var oDelimiter = new CDelimiter(props);
						this.CreateElem(oDelimiter,this);
						break;
			case 115:	props = {ctrPrp: new CTextPr(), column:1, begChr:8214, endChr:-1};
						var oDelimiter = new CDelimiter(props);
						this.CreateElem(oDelimiter,this);
						break;
			case 116:	props = {ctrPrp: new CTextPr(), column:1, begChr:-1, endChr:8214};
						var oDelimiter = new CDelimiter(props);
						this.CreateElem(oDelimiter,this);
						break;
			case 117:	props = {ctrPrp: new CTextPr(), column:1, begChr:10214, endChr:-1};
						var oDelimiter = new CDelimiter(props);
						this.CreateElem(oDelimiter,this);
						break;
			case 118:	props = {ctrPrp: new CTextPr(), column:1, begChr:-1, endChr:10215};
						var oDelimiter = new CDelimiter(props);
						this.CreateElem(oDelimiter,this);
						break;
			case 119:	props = {ctrPrp: new CTextPr(), column:1, begChr:123, endChr:-1};
						var oDelimiter = new CDelimiter(props);
						this.CreateElem(oDelimiter,this);
						var oElem = oDelimiter.getBase(0);
						
						props = {ctrPrp: new CTextPr(), row:2};
						var oEqArr = new CEqArray(props);
						this.CreateElem(oEqArr,oElem);
						break;
			case 120:	props = {ctrPrp: new CTextPr(), column:1, begChr:123, endChr:-1};
						var oDelimiter = new CDelimiter(props);
						this.CreateElem(oDelimiter,this);
						var oElem = oDelimiter.getBase(0);
						
						props = {ctrPrp: new CTextPr(), row:3};
						var oEqArr = new CEqArray(props);						
						this.CreateElem(oEqArr,oElem);
						break;
			case 121:	props = {ctrPrp: new CTextPr(), type:NO_BAR_FRACTION};
						var oFraction = new CFraction(props);
						this.CreateFraction(oFraction, this, null, null);
						break;
			case 122:	props = {ctrPrp: new CTextPr(), column:1};
						var oDelimiter = new CDelimiter(props);
						this.CreateElem(oDelimiter,this);
						var oElem = oDelimiter.getBase(0);
						
						props = {ctrPrp: new CTextPr(), type:NO_BAR_FRACTION};
						var oFraction = new CFraction(props);
						this.CreateFraction(oFraction,oElem,null,null);
						break;
			case 123:	this.AddText(this, "f");
						props = {ctrPrp: new CTextPr(), column:1};
						var oDelimiter1 = new CDelimiter(props);
						this.CreateElem(oDelimiter1,this);
						var del1Elem = oDelimiter1.getBase(0);
						this.AddText(del1Elem, "x");
						this.AddText(this, "=");
						
						props = {ctrPrp: new CTextPr(), column:1, begChr:123, endChr:-1};
						var oDelimiter2 = new CDelimiter(props);
						this.CreateElem(oDelimiter2,this);
						var del2Elem = oDelimiter2.getBase(0);
						
						props = {ctrPrp: new CTextPr(), row:2};
						var oEqArr = new CEqArray(props);
						this.CreateElem(oEqArr, del2Elem);
						
						var eqArrElem0 = oEqArr.getElement(0);
						this.AddText(eqArrElem0, "-x,  &x<0");
						var eqArrElem0 = oEqArr.getElement(1);
						var sTxt = "x,  &x" + String.fromCharCode(8805) + "0";
						this.AddText(eqArrElem0,sTxt);
						break;
			case 124:	props = {ctrPrp: new CTextPr(), column:1};
						var oDelimiter = new CDelimiter(props);
						this.CreateElem(oDelimiter,this);
						var oElem = oDelimiter.getBase(0);
						
						props = {ctrPrp: new CTextPr(), type:NO_BAR_FRACTION};
						var oFraction = new CFraction(props);
						this.CreateFraction(oFraction,oElem,"n","k");
						break;
			case 125:	props = {ctrPrp: new CTextPr(), column:1, begChr:10216, endChr:10217};
						var oDelimiter = new CDelimiter(props);
						this.CreateElem(oDelimiter,this);
						var oElem = oDelimiter.getBase(0);
						
						props = {ctrPrp: new CTextPr(), type:NO_BAR_FRACTION};
						var oFraction = new CFraction(props);
						this.CreateFraction(oFraction,oElem,"n","k");
						break;
			case 126:	var oFunc = new CMathFunc(props);
						this.CreateElem(oFunc,this);
						oFName = oFunc.getFName();
						props = {ctrPrp: new CTextPr(), sty:"p"};
						this.AddText(oFName, "sin", props);
						var oElem = oFunc.getArgument();
						break;
			case 127:	var oFunc = new CMathFunc(props);
						this.CreateElem(oFunc,this);
						oFName = oFunc.getFName();						
						props = {ctrPrp: new CTextPr(), sty:"p"};
						this.AddText(oFName, "cos", props);
						var oElem = oFunc.getArgument();
						break;
			case 128:	var oFunc = new CMathFunc(props);
						this.CreateElem(oFunc,this);
						oFName = oFunc.getFName();						
						props = {ctrPrp: new CTextPr(), sty:"p"};
						this.AddText(oFName, "tan", props);
						var oElem = oFunc.getArgument();
						break;
			case 129:	var oFunc = new CMathFunc(props);
						this.CreateElem(oFunc,this);
						oFName = oFunc.getFName();						
						props = {ctrPrp: new CTextPr(), sty:"p"};
						this.AddText(oFName, "csc", props);
						var oElem = oFunc.getArgument();
						break;
			case 130:	var oFunc = new CMathFunc(props);
						this.CreateElem(oFunc,this);
						oFName = oFunc.getFName();						
						props = {ctrPrp: new CTextPr(), sty:"p"};
						this.AddText(oFName, "sec", props);
						var oElem = oFunc.getArgument();
						break;
			case 131:	var oFunc = new CMathFunc(props);
						this.CreateElem(oFunc,this);
						oFName = oFunc.getFName();						
						props = {ctrPrp: new CTextPr(), sty:"p"};
						this.AddText(oFName, "cot", props);
						var oElem = oFunc.getArgument();
						break;
			case 132:	var oFunc = new CMathFunc(props);
						this.CreateElem(oFunc,this);
						oFName = oFunc.getFName();						
						
						props = {ctrPrp: new CTextPr(), type:DEGREE_SUPERSCRIPT};
						var sBase = "sin";
						var sSup = "-1";
						var oDegree = new CDegree(props);
						this.CreateDegree(oDegree, oFName, sBase, sSup, null);	
						var oElem = oFunc.getArgument();
						break;
			case 133:	var oFunc = new CMathFunc(props);
						this.CreateElem(oFunc,this);
						oFName = oFunc.getFName();						
						
						props = {ctrPrp: new CTextPr(), type:DEGREE_SUPERSCRIPT};
						var sBase = "cos";
						var sSup = "-1";
						var oDegree = new CDegree(props);
						this.CreateDegree(oDegree, oFName, sBase, sSup, null);	
						var oElem = oFunc.getArgument();
						break;
			case 134:	var oFunc = new CMathFunc(props);
						this.CreateElem(oFunc,this);
						oFName = oFunc.getFName();						
						
						props = {ctrPrp: new CTextPr(), type:DEGREE_SUPERSCRIPT};
						var sBase = "tan";
						var sSup = "-1";
						var oDegree = new CDegree(props);
						this.CreateDegree(oDegree, oFName, sBase, sSup, null);
						var oElem = oFunc.getArgument();
						break;
			case 135:	var oFunc = new CMathFunc(props);
						this.CreateElem(oFunc,this);
						oFName = oFunc.getFName();						
						
						props = {ctrPrp: new CTextPr(), type:DEGREE_SUPERSCRIPT};
						var sBase = "csc";
						var sSup = "-1";
						var oDegree = new CDegree(props);
						this.CreateDegree(oDegree, oFName, sBase, sSup, null);
						var oElem = oFunc.getArgument();
						break;
			case 136:	var oFunc = new CMathFunc(props);
						this.CreateElem(oFunc,this);
						oFName = oFunc.getFName();						
						
						props = {ctrPrp: new CTextPr(), type:DEGREE_SUPERSCRIPT};
						var sBase = "sec";
						var sSup = "-1";
						var oDegree = new CDegree(props);
						this.CreateDegree(oDegree, oFName, sBase, sSup, null);
						var oElem = oFunc.getArgument();
						break;
			case 137:	var oFunc = new CMathFunc(props);
						this.CreateElem(oFunc,this);
						oFName = oFunc.getFName();						
						
						props = {ctrPrp: new CTextPr(), type:DEGREE_SUPERSCRIPT};
						var sBase = "cot";
						var sSup = "-1";
						var oDegree = new CDegree(props);
						this.CreateDegree(oDegree, oFName, sBase, sSup, null);
						var oElem = oFunc.getArgument();
						break;
			case 138:	var oFunc = new CMathFunc(props);
						this.CreateElem(oFunc,this);
						oFName = oFunc.getFName();						
						props = {ctrPrp: new CTextPr(), sty:"p"};
						this.AddText(oFName, "sinh", props);
						var oElem = oFunc.getArgument();
						break;
			case 139:	var oFunc = new CMathFunc(props);
						this.CreateElem(oFunc,this);
						oFName = oFunc.getFName();						
						props = {ctrPrp: new CTextPr(), sty:"p"};
						this.AddText(oFName, "cosh", props);
						var oElem = oFunc.getArgument();
						break;
			case 140:	var oFunc = new CMathFunc(props);
						this.CreateElem(oFunc,this);
						oFName = oFunc.getFName();						
						props = {ctrPrp: new CTextPr(), sty:"p"};
						this.AddText(oFName, "tanh", props);
						var oElem = oFunc.getArgument();
						break;
			case 141:	var oFunc = new CMathFunc(props);
						this.CreateElem(oFunc,this);
						oFName = oFunc.getFName();						
						props = {ctrPrp: new CTextPr(), sty:"p"};
						this.AddText(oFName, "csch", props);
						var oElem = oFunc.getArgument();
						break;
			case 142:	var oFunc = new CMathFunc(props);
						this.CreateElem(oFunc,this);
						oFName = oFunc.getFName();						
						props = {ctrPrp: new CTextPr(), sty:"p"};
						this.AddText(oFName, "sech", props);
						var oElem = oFunc.getArgument();
						break;
			case 143:	var oFunc = new CMathFunc(props);
						this.CreateElem(oFunc,this);
						oFName = oFunc.getFName();						
						props = {ctrPrp: new CTextPr(), sty:"p"};
						this.AddText(oFName, "coth", props);
						var oElem = oFunc.getArgument();
						break;
			case 144:	var oFunc = new CMathFunc(props);
						this.CreateElem(oFunc,this);
						oFName = oFunc.getFName();						
						
						props = {ctrPrp: new CTextPr(), type:DEGREE_SUPERSCRIPT};
						var sBase = "sinh";
						var sSup = "-1";
						var oDegree = new CDegree(props);
						this.CreateDegree(oDegree, oFName, sBase, sSup, null);	
						var oElem = oFunc.getArgument();
						break;
			case 145:	var oFunc = new CMathFunc(props);
						this.CreateElem(oFunc,this);
						oFName = oFunc.getFName();						
						
						props = {ctrPrp: new CTextPr(), type:DEGREE_SUPERSCRIPT};
						var sBase = "cosh";
						var sSup = "-1";
						var oDegree = new CDegree(props);
						this.CreateDegree(oDegree, oFName, sBase, sSup, null);
						var oElem = oFunc.getArgument();
						break;
			case 146:	var oFunc = new CMathFunc(props);
						this.CreateElem(oFunc,this);
						oFName = oFunc.getFName();						
						
						props = {ctrPrp: new CTextPr(), type:DEGREE_SUPERSCRIPT};
						var sBase = "tanh";
						var sSup = "-1";
						var oDegree = new CDegree(props);
						this.CreateDegree(oDegree, oFName, sBase, sSup, null);
						var oElem = oFunc.getArgument();
						break;
			case 147:	var oFunc = new CMathFunc(props);
						this.CreateElem(oFunc,this);
						oFName = oFunc.getFName();						
						
						props = {ctrPrp: new CTextPr(), type:DEGREE_SUPERSCRIPT};
						var sBase = "csch";
						var sSup = "-1";
						var oDegree = new CDegree(props);
						this.CreateDegree(oDegree, oFName, sBase, sSup, null);
						var oElem = oFunc.getArgument();
						break;
			case 148:	var oFunc = new CMathFunc(props);
						this.CreateElem(oFunc,this);
						oFName = oFunc.getFName();						
						
						props = {ctrPrp: new CTextPr(), type:DEGREE_SUPERSCRIPT};
						var sBase = "sech";
						var sSup = "-1";
						var oDegree = new CDegree(props);
						this.CreateDegree(oDegree, oFName, sBase, sSup, null);
						var oElem = oFunc.getArgument();
						break;
			case 149:	var oFunc = new CMathFunc(props);
						this.CreateElem(oFunc,this);
						oFName = oFunc.getFName();						
						
						props = {ctrPrp: new CTextPr(), type:DEGREE_SUPERSCRIPT};
						var sBase = "coth";
						var sSup = "-1";
						var oDegree = new CDegree(props);
						this.CreateDegree(oDegree, oFName, sBase, sSup, null);
						var oElem = oFunc.getArgument();
						break;
			case 150:	var oFunc = new CMathFunc(props);
						this.CreateElem(oFunc,this);
						oFName = oFunc.getFName();						
						props = {ctrPrp: new CTextPr(), sty:"p"};
						this.AddText(oFName, "sin", props);
						
						oArg = oFunc.getArgument();
						var argText = String.fromCharCode(952);
						this.AddText(oArg, argText);
						break;
			case 151:	var oFunc = new CMathFunc(props);
						this.CreateElem(oFunc,this);
						oFName = oFunc.getFName();						
						props = {ctrPrp: new CTextPr(), sty:"p"};
						this.AddText(oFName, "cos", props);
						
						oArg = oFunc.getArgument();
						this.AddText(oArg, "2x");
						break;
			case 152:	var oFunc = new CMathFunc(props);
						this.CreateElem(oFunc,this);
						oFName = oFunc.getFName();						
						props = {ctrPrp: new CTextPr(), sty:"p"};
						this.AddText(oFName, "tan", props);						
						oArg = oFunc.getArgument();
						var argText = String.fromCharCode(952);
						this.AddText(oArg, argText);
						this.AddText(this, "=");
						
						props = {ctrPrp: new CTextPr()};
						var oFraction = new CFraction(props);
						this.CreateElem(oFraction, this);
						
						var oNum = oFraction.getNumerator();						
						props = {ctrPrp: new CTextPr()};
						var oFuncNum = new CMathFunc(props);
						this.CreateElem(oFuncNum,oNum);
						var oFNameNum = oFuncNum.getFName();
						props = {ctrPrp: new CTextPr(), sty:"p"};
						this.AddText(oFNameNum, "sin", props);						
						var oArgNum = oFuncNum.getArgument();
						this.AddText(oArgNum, argText);
						
						var oDen = oFraction.getDenominator();
						props = {ctrPrp: new CTextPr()};
						var oFuncDen = new CMathFunc(props);
						this.CreateElem(oFuncDen,oDen);
						var oFNameDen = oFuncDen.getFName();
						props = {ctrPrp: new CTextPr(), sty:"p"};
						this.AddText(oFNameDen, "cos", props);						
						var oArgDen = oFuncDen.getArgument();
						this.AddText(oArgDen, argText);						
						break;
			case 153:	props = {ctrPrp: new CTextPr(), chr:775};
						var oAcc = new CAccent(props);
						this.CreateElem(oAcc,this);
						break;
			case 154:	props = {ctrPrp: new CTextPr(), chr:776};
						var oAcc = new CAccent(props);
						this.CreateElem(oAcc,this);
						break;
			case 155:	props = {ctrPrp: new CTextPr(), chr:8411};
						var oAcc = new CAccent(props);
						this.CreateElem(oAcc,this);
						break;
			case 156:	var oAcc = new CAccent(props);
						this.CreateElem(oAcc,this);
						break;
			case 157:	props = {ctrPrp: new CTextPr(), chr:780};
						var oAcc = new CAccent(props);
						this.CreateElem(oAcc,this);
						break;
			case 158:	props = {ctrPrp: new CTextPr(), chr:769};
						var oAcc = new CAccent(props);
						this.CreateElem(oAcc,this);
						break;
			case 159:	props = {ctrPrp: new CTextPr(), chr:768};
						var oAcc = new CAccent(props);
						this.CreateElem(oAcc,this);
						break;
			case 160:	props = {ctrPrp: new CTextPr(), chr:774};
						var oAcc = new CAccent(props);
						this.CreateElem(oAcc,this);
						break;
			case 161:	props = {ctrPrp: new CTextPr(), chr:771};
						var oAcc = new CAccent(props);
						this.CreateElem(oAcc,this);
						break;
			case 162:	props = {ctrPrp: new CTextPr(), chr:773};
						var oAcc = new CAccent(props);
						this.CreateElem(oAcc,this);
						break;
			case 163:	props = {ctrPrp: new CTextPr(), chr:831};
						var oAcc = new CAccent(props);
						this.CreateElem(oAcc,this);
						break;
			case 164:	props = {ctrPrp: new CTextPr(), chr:9182, pos:VJUST_TOP, vertJc:VJUST_BOT};
						oGroupChr = new CGroupCharacter(props);
						this.CreateElem(oGroupChr,this);
						break;
			case 165:	oGroupChr = new CGroupCharacter(props);
						this.CreateElem(oGroupChr,this);
						break;
			case 166:	props = {ctrPrp: new CTextPr(), type:LIMIT_UP};
						var oLimUpp = new CLimit(props);
						this.CreateElem(oLimUpp,this);
						var oLim = oLimUpp.getIterator();
						var oElem = oLimUpp.getFName();
				
						props = {ctrPrp: new CTextPr(), chr:9182, pos:VJUST_TOP, vertJc:VJUST_BOT};
						oGroupChr = new CGroupCharacter(props);
						this.CreateElem(oGroupChr,oElem);
						var grElem = oGroupChr.getBase();
						break;
			case 167:	props = {ctrPrp: new CTextPr(), type:LIMIT_LOW};
						var oLimLow = new CLimit(props);
						this.CreateElem(oLimLow,this);
						var oLim = oLimLow.getIterator();
						var oElem = oLimLow.getFName();
				
						oGroupChr = new CGroupCharacter(props);
						this.CreateElem(oGroupChr,oElem);
						var grElem = oGroupChr.getBase();
						break;
			case 168:	props = {ctrPrp: new CTextPr(), chr:8406};
						var oAcc = new CAccent(props);
						this.CreateElem(oAcc,this);
						break;
			case 169:	props = {ctrPrp: new CTextPr(), chr:8407};
						var oAcc = new CAccent(props);
						this.CreateElem(oAcc,this);
						break;
			case 170:	props = {ctrPrp: new CTextPr(), chr:8417};
						var oAcc = new CAccent(props);
						this.CreateElem(oAcc,this);
						break;
			case 171:	props = {ctrPrp: new CTextPr(), chr:8400};
						var oAcc = new CAccent(props);
						this.CreateElem(oAcc,this);
						break;
			case 172:	props = {ctrPrp: new CTextPr(), chr:8401};
						var oAcc = new CAccent(props);
						this.CreateElem(oAcc,this);
						break;
			case 173:	var oBorderBox = new CBorderBox(props);
						this.CreateElem(oBorderBox,this);
						break;
			case 174:	var oBorderBox = new CBorderBox(props);
						this.CreateElem(oBorderBox,this);
						var oElem = oBorderBox.getBase();
						
						props = {ctrPrp: new CTextPr(), type:DEGREE_SUPERSCRIPT};
						var oDegree0 = new CDegree(props);
						this.CreateDegree(oDegree0, oElem, "a", "2", null);
						this.AddText(oElem, "=");
						var oDegree1 = new CDegree(props);
						this.CreateDegree(oDegree1, oElem, "b", "2", null);
						this.AddText(oElem, "+");
						var oDegree2 = new CDegree(props);
						this.CreateDegree(oDegree2, oElem, "c", "2", null);					
						break;
			case 175:	props = {ctrPrp: new CTextPr(), pos:LOCATION_TOP};
						var oBar = new CBar(props);
						this.CreateElem(oBar,this);
						break;
			case 176:	var oBar = new CBar(props);
						this.CreateElem(oBar,this);
						break;
			case 177:	props = {ctrPrp: new CTextPr(), pos:LOCATION_TOP};
						var oBar = new CBar(props);
						this.CreateElem(oBar,this);
						oElem = oBar.getBase();
						this.AddText(oElem, "A");
						break;
			case 178:	props = {ctrPrp: new CTextPr(), pos:LOCATION_TOP};
						var oBar = new CBar(props);
						this.CreateElem(oBar,this);
						oElem = oBar.getBase();
						this.AddText(oElem, "ABC");
						break;
			case 179:	props = {ctrPrp: new CTextPr(), pos:LOCATION_TOP};
						var oBar = new CBar(props);
						this.CreateElem(oBar,this);
						oElem = oBar.getBase();
						var sText = "x" + String.fromCharCode(8853) + "y";
						this.AddText(oElem, sText);
						break;
			case 180:	var oFunc = new CMathFunc(props);
						this.CreateElem(oFunc,this);		
						var oArg = oFunc.getArgument();
						oFName = oFunc.getFName();
						
						props = {ctrPrp: new CTextPr(), type:DEGREE_SUBSCRIPT};
						var oSSub = new CDegree(props);
						this.CreateElem(oSSub, oFName);
						
						var sSubBase = oSSub.getBase();						
						props = {ctrPrp: new CTextPr(), sty:"p"};
						this.AddText(sSubBase, "log", props);
						var oSub = oSSub.getLowerIterator();
						break;
			case 181:	var oFunc = new CMathFunc(props);
						this.CreateElem(oFunc,this);
						var oArg = oFunc.getArgument();
						oFName = oFunc.getFName();						
						props = {ctrPrp: new CTextPr(), sty:"p"};
						this.AddText(oFName, "log", props);
						break;
			case 182:	var oFunc = new CMathFunc(props);
						this.CreateElem(oFunc,this);
						var oArg = oFunc.getArgument();
							
						oFName = oFunc.getFName();						
						props = {ctrPrp: new CTextPr(), type:LIMIT_LOW};
						var oLimLow = new CLimit(props);
						this.CreateElem(oLimLow, oFName);						
						
						var oElem = oLimLow.getFName();
						props = {ctrPrp: new CTextPr(), sty:"p"};
						this.AddText(oElem, "lim", props);	
						
						var oLim = oLimLow.getIterator();
						break;
			case 183:	var oFunc = new CMathFunc(props);
						this.CreateElem(oFunc,this);	
						var oArg = oFunc.getArgument();
						
						oFName = oFunc.getFName();						
						props = {ctrPrp: new CTextPr(), type:LIMIT_LOW};
						var oLimLow = new CLimit(props);
						this.CreateElem(oLimLow, oFName);
						var oLim = oLimLow.getIterator();
						
						var oElem = oLimLow.getFName();
						props = {ctrPrp: new CTextPr(), sty:"p"};
						this.AddText(oElem, "min", props);						
						break;
			case 184:	var oFunc = new CMathFunc(props);
						this.CreateElem(oFunc,this);	
						var oArg = oFunc.getArgument();
						
						oFName = oFunc.getFName();						
						props = {ctrPrp: new CTextPr(), type:LIMIT_LOW};
						var oLimLow = new CLimit(props);
						this.CreateElem(oLimLow, oFName);
						var oLim = oLimLow.getIterator();
						
						var oElem = oLimLow.getFName();
						props = {ctrPrp: new CTextPr(), sty:"p"};
						this.AddText(oElem, "max", props);						
						break;
			case 185:	var oFunc = new CMathFunc(props);
						this.CreateElem(oFunc,this);
						var oArg = oFunc.getArgument();
						
						oFName = oFunc.getFName();						
						props = {ctrPrp: new CTextPr(), sty:"p"};
						this.AddText(oFName, "ln", props);
						break;
			case 186:	var oFunc = new CMathFunc(props);
						this.CreateElem(oFunc,this);	
						
						oFName = oFunc.getFName();							
						props = {ctrPrp: new CTextPr(), type:LIMIT_LOW};
						var oLimLow = new CLimit(props);
						this.CreateElem(oLimLow, oFName);
						var limLowElem = oLimLow.getFName();
						props = {ctrPrp: new CTextPr(), sty:"p"};
						this.AddText(limLowElem, "lim", props);
						var limLowLim = oLimLow.getIterator();
						var sText = "n" + String.fromCharCode(8594,8734)
						this.AddText(limLowLim, sText);
						
						var oElem = oFunc.getArgument();
						props = {ctrPrp: new CTextPr(), type:DEGREE_SUPERSCRIPT};
						var oDegree = new CDegree(props);
						this.CreateElem(oDegree, oElem);
						var oSup = oDegree.getUpperIterator();
						this.AddText(oSup, "n");
						var degreeElem = oDegree.getBase();
						
						props = {ctrPrp: new CTextPr(), column:1};
						var oDelimiter = new CDelimiter(props);
						this.CreateElem(oDelimiter,degreeElem);
						var delElem = oDelimiter.getBase(0);
						this.AddText(delElem,"1+");
						
						props = {ctrPrp: new CTextPr()};
						var oFraction = new CFraction(props);
						this.CreateFraction(oFraction,delElem,"1","n");
						break;
			case 187:	var oFunc = new CMathFunc(props);
						this.CreateElem(oFunc,this);	
						
						oFName = oFunc.getFName();
						props = {ctrPrp: new CTextPr(), type:LIMIT_LOW};
						var oLimLow = new CLimit(props);
						this.CreateElem(oLimLow, oFName);
						
						var limLowElem = oLimLow.getFName();
						props = {ctrPrp: new CTextPr(), sty:"p"};
						this.AddText(limLowElem, "max", props);
						var limLowLim = oLimLow.getIterator();
						var sText = "0" + String.fromCharCode(8804) + "x" + String.fromCharCode(8804) + "1";
						this.AddText(limLowLim, sText);
						
						var oElem = oFunc.getArgument();
						this.AddText(oElem, "x");
						props = {ctrPrp: new CTextPr(), type:DEGREE_SUPERSCRIPT};
						var oDegree = new CDegree(props);
						this.CreateElem(oDegree, oElem);
						var degreeElem = oDegree.getBase();
						this.AddText(degreeElem, "e");
						
						var oSup = oDegree.getUpperIterator();
						this.AddText(oSup, "-");
						props = {ctrPrp: new CTextPr(), type:DEGREE_SUPERSCRIPT};
						var supSup = new CDegree(props);
						this.CreateElem(supSup, oSup);
						var supElem = supSup.getBase();
						this.AddText(supElem, "x");
						var supSupSup = supSup.getUpperIterator();
						this.AddText(supSupSup, "2");
						break;
			case 188:	props = {ctrPrp: new CTextPr(), opEmu:1};
						var oBox = new CBox(props);
						this.CreateElem(oBox,this);
						var oElem = oBox.getBase();
						this.AddText(oElem, ":=");
						break;
			case 189:	props = {ctrPrp: new CTextPr(), opEmu:1};
						var oBox = new CBox(props);
						this.CreateElem(oBox,this);
						var oElem = oBox.getBase();
						this.AddText(oElem, "==");
						break;
			case 190:	props = {ctrPrp: new CTextPr(), opEmu:1};
						var oBox = new CBox(props);
						this.CreateElem(oBox,this);
						var oElem = oBox.getBase();
						this.AddText(oElem, "+=");
						break;
			case 191:	props = {ctrPrp: new CTextPr(), opEmu:1};
						var oBox = new CBox(props);
						this.CreateElem(oBox,this);
						var oElem = oBox.getBase();
						this.AddText(oElem, "-=");
						break;
			case 192:	var sText = String.fromCharCode(8797);
						this.AddText(this, sText);
						break;
			case 193:	var sText = String.fromCharCode(8798);
						this.AddText(this, sText);
						break;
			case 194:	var sText = String.fromCharCode(8796);
						this.AddText(this, sText);
						break;
			case 195:	props = {ctrPrp: new CTextPr(), opEmu:1};
						var oBox = new CBox(props);
						this.CreateElem(oBox,this);
						var oElem = oBox.getBase();
						
						props = {ctrPrp: new CTextPr(), pos:VJUST_TOP, chr:8592}
						var oGroupChr = new CGroupCharacter(props);
						this.CreateElem(oGroupChr,oElem);
						break;
			case 196:	props = {ctrPrp: new CTextPr(), opEmu:1};
						var oBox = new CBox(props);
						this.CreateElem(oBox,this);
						var oElem = oBox.getBase();
						
						props = {ctrPrp: new CTextPr(), pos:VJUST_TOP, chr:8594}
						var oGroupChr = new CGroupCharacter(props);
						this.CreateElem(oGroupChr,oElem);
						break;
			case 197:	props = {ctrPrp: new CTextPr(), opEmu:1};
						var oBox = new CBox(props);
						this.CreateElem(oBox,this);
						var oElem = oBox.getBase();
						
						props = {ctrPrp: new CTextPr(), vertJc:VJUST_BOT, chr:8592}
						var oGroupChr = new CGroupCharacter(props);
						this.CreateElem(oGroupChr,oElem);
						break;
			case 198:	props = {ctrPrp: new CTextPr(), opEmu:1};
						var oBox = new CBox(props);
						this.CreateElem(oBox,this);
						var oElem = oBox.getBase();
						
						props = {ctrPrp: new CTextPr(), vertJc:VJUST_BOT, chr:8594}
						var oGroupChr = new CGroupCharacter(props);
						this.CreateElem(oGroupChr,oElem);
						break;
			case 199:	props = {ctrPrp: new CTextPr(), opEmu:1};
						var oBox = new CBox(props);
						this.CreateElem(oBox,this);
						var oElem = oBox.getBase();
						
						props = {ctrPrp: new CTextPr(), pos:VJUST_TOP, chr:8656}
						var oGroupChr = new CGroupCharacter(props);
						this.CreateElem(oGroupChr,oElem);
						break;
			case 200:	props = {ctrPrp: new CTextPr(), opEmu:1};
						var oBox = new CBox(props);
						this.CreateElem(oBox,this);
						var oElem = oBox.getBase();
						
						props = {ctrPrp: new CTextPr(), pos:VJUST_TOP, chr:8658}
						var oGroupChr = new CGroupCharacter(props);
						this.CreateElem(oGroupChr,oElem);
						break;
			case 201:	props = {ctrPrp: new CTextPr(), opEmu:1};
						var oBox = new CBox(props);
						this.CreateElem(oBox,this);
						var oElem = oBox.getBase();
						
						props = {ctrPrp: new CTextPr(), vertJc:VJUST_BOT, chr:8656}
						var oGroupChr = new CGroupCharacter(props);
						this.CreateElem(oGroupChr,oElem);
						break;
			case 202:	props = {ctrPrp: new CTextPr(), opEmu:1};
						var oBox = new CBox(props);
						this.CreateElem(oBox,this);
						var oElem = oBox.getBase();
						
						props = {ctrPrp: new CTextPr(), vertJc:VJUST_BOT, chr:8658}
						var oGroupChr = new CGroupCharacter(props);
						this.CreateElem(oGroupChr,oElem);
						break;
			case 203:	props = {ctrPrp: new CTextPr(), opEmu:1};
						var oBox = new CBox(props);
						this.CreateElem(oBox,this);
						var oElem = oBox.getBase();
						
						props = {ctrPrp: new CTextPr(), pos:VJUST_TOP, chr:8596}
						var oGroupChr = new CGroupCharacter(props);
						this.CreateElem(oGroupChr,oElem);
						break;
			case 204:	props = {ctrPrp: new CTextPr(), opEmu:1};
						var oBox = new CBox(props);
						this.CreateElem(oBox,this);
						var oElem = oBox.getBase();
						
						props = {ctrPrp: new CTextPr(), vertJc:VJUST_BOT, chr:8596}
						var oGroupChr = new CGroupCharacter(props);
						this.CreateElem(oGroupChr,oElem);
						break;
			case 205:	props = {ctrPrp: new CTextPr(), opEmu:1};
						var oBox = new CBox(props);
						this.CreateElem(oBox,this);
						var oElem = oBox.getBase();
						
						props = {ctrPrp: new CTextPr(), pos:VJUST_TOP, chr:8660}
						var oGroupChr = new CGroupCharacter(props);
						this.CreateElem(oGroupChr,oElem);
						break;
			case 206:	props = {ctrPrp: new CTextPr(), opEmu:1};
						var oBox = new CBox(props);
						this.CreateElem(oBox,this);
						var oElem = oBox.getBase();
						
						props = {ctrPrp: new CTextPr(), vertJc:VJUST_BOT, chr:8660}
						var oGroupChr = new CGroupCharacter(props);
						this.CreateElem(oGroupChr,oElem);
						break;
			case 207:	props = {ctrPrp: new CTextPr(), opEmu:1};
						var oBox = new CBox(props);
						this.CreateElem(oBox,this);
						var oElem = oBox.getBase();
						
						props = {ctrPrp: new CTextPr(), vertJc:VJUST_BOT, chr:8594}
						var oGroupChr = new CGroupCharacter(props);
						this.CreateElem(oGroupChr,oElem);
						var groupElem = oGroupChr.getBase();
						this.AddText(groupElem,"yields");
						break;
			case 208:	props = {ctrPrp: new CTextPr(), opEmu:1};
						var oBox = new CBox(props);
						this.CreateElem(oBox,this);
						var oElem = oBox.getBase();
						
						props = {ctrPrp: new CTextPr(), vertJc:VJUST_BOT, chr:8594}
						var oGroupChr = new CGroupCharacter(props);
						this.CreateElem(oGroupChr,oElem);
						var groupElem = oGroupChr.getBase();
						var sText = String.fromCharCode(8710);
						this.AddText(groupElem,sText);
						break;
			case 209:	var oMcs = [{count: 2, mcJc:MCJC_CENTER}];
						props = {ctrPrp: new CTextPr(), row:1, mcs: oMcs};
						var oMatrix = new CMathMatrix(props);
						this.CreateElem(oMatrix,this);
						break;		
			case 210:	var oMcs = [{count: 1, mcJc:MCJC_CENTER}];
						props = {ctrPrp: new CTextPr(), row:2, mcs: oMcs};
						var oMatrix = new CMathMatrix(props);
						this.CreateElem(oMatrix,this);
						break;	
			case 211:	var oMcs = [{count: 3, mcJc:MCJC_CENTER}];
						props = {ctrPrp: new CTextPr(), row:1, mcs: oMcs};
						var oMatrix = new CMathMatrix(props);
						this.CreateElem(oMatrix,this);
						break;
			case 212:	var oMcs = [{count: 1, mcJc:MCJC_CENTER}];
						props = {ctrPrp: new CTextPr(), row:3, mcs: oMcs};
						var oMatrix = new CMathMatrix(props);
						this.CreateElem(oMatrix,this);
						break;	
			case 213:	var oMcs = [{count: 2, mcJc:MCJC_CENTER}];
						props = {ctrPrp: new CTextPr(), row:2, mcs: oMcs};
						var oMatrix = new CMathMatrix(props);
						this.CreateElem(oMatrix,this);
						break;
			case 214:	var oMcs = [{count: 3, mcJc:MCJC_CENTER}];
						props = {ctrPrp: new CTextPr(), row:2, mcs: oMcs};
						var oMatrix = new CMathMatrix(props);
						this.CreateElem(oMatrix,this);
						break;
			case 215:	var oMcs = [{count: 2, mcJc:MCJC_CENTER}];
						props = {ctrPrp: new CTextPr(), row:3, mcs: oMcs};
						var oMatrix = new CMathMatrix(props);
						this.CreateElem(oMatrix,this);
						break;
			case 216:	var oMcs = [{count: 3, mcJc:MCJC_CENTER}];
						props = {ctrPrp: new CTextPr(), row:3, mcs: oMcs};
						var oMatrix = new CMathMatrix(props);
						this.CreateElem(oMatrix,this);
						break;
			case 217:	var sText = String.fromCharCode(8943);
						this.AddText(this,sText);
						break;
			case 218:	var sText = String.fromCharCode(8230);
						this.AddText(this,sText);
						break;
			case 219:	var sText = String.fromCharCode(8942);
						this.AddText(this,sText);
						break;
			case 220:	var sText = String.fromCharCode(8945);
						this.AddText(this,sText);
						break;
			case 221:	var oMcs = [{count: 2, mcJc:MCJC_CENTER}];
						props = {ctrPrp: new CTextPr(), row:2, mcs: oMcs};
						var oMatrix = new CMathMatrix(props);
						this.CreateElem(oMatrix,this);
						var oElem = oMatrix.getElement(0,0);
						this.AddText(oElem, "1");
						oElem = oMatrix.getElement(0,1);
						this.AddText(oElem, "0");
						oElem = oMatrix.getElement(1,0);
						this.AddText(oElem, "0");
						oElem = oMatrix.getElement(1,1);
						this.AddText(oElem, "1");
						break;
			case 222:	var oMcs = [{count: 2, mcJc:MCJC_CENTER}];
						props = {ctrPrp: new CTextPr(), row:2, mcs: oMcs, plcHide:1};
						var oMatrix = new CMathMatrix(props);
						this.CreateElem(oMatrix,this);
						var oElem = oMatrix.getElement(0,0);
						this.AddText(oElem, "1");
						oElem = oMatrix.getElement(1,1);
						this.AddText(oElem, "1");
						break;
			case 223:	var oMcs = [{count: 3, mcJc:MCJC_CENTER}];
						props = {ctrPrp: new CTextPr(), row:3, mcs: oMcs};
						var oMatrix = new CMathMatrix(props);
						this.CreateElem(oMatrix,this);
						var oElem = oMatrix.getElement(0,0);
						this.AddText(oElem, "1");
						oElem = oMatrix.getElement(0,1);
						this.AddText(oElem, "0");
						oElem = oMatrix.getElement(0,2);
						this.AddText(oElem, "0");
						oElem = oMatrix.getElement(1,0);
						this.AddText(oElem, "0");
						oElem = oMatrix.getElement(1,1);
						this.AddText(oElem, "1");
						oElem = oMatrix.getElement(1,2);
						this.AddText(oElem, "0");
						oElem = oMatrix.getElement(2,0);
						this.AddText(oElem, "0");
						oElem = oMatrix.getElement(2,1);
						this.AddText(oElem, "0");
						oElem = oMatrix.getElement(2,2);
						this.AddText(oElem, "1");
						break;
			case 224:	var oMcs = [{count: 3, mcJc:MCJC_CENTER}];
						props = {ctrPrp: new CTextPr(), row:3, mcs: oMcs, plcHide:1};
						var oMatrix = new CMathMatrix(props);
						this.CreateElem(oMatrix,this);
						var oElem = oMatrix.getElement(0,0);
						this.AddText(oElem, "1");
						oElem = oMatrix.getElement(1,1);
						this.AddText(oElem, "1");
						oElem = oMatrix.getElement(2,2);
						this.AddText(oElem, "1");
						break;
			case 225:	props = {ctrPrp: new CTextPr(), column:1};
						var oDelimiter = new CDelimiter(props);
						this.CreateElem(oDelimiter,this);
						var delimiterBase = oDelimiter.getBase(0);
						
						var oMcs = [{count: 2, mcJc:MCJC_CENTER}];
						props = {ctrPrp: new CTextPr(), row:2, mcs: oMcs};
						var oMatrix = new CMathMatrix(props);
						this.CreateElem(oMatrix,delimiterBase);
						break;
			case 226:	props = {ctrPrp: new CTextPr(), column:1,begChr:91, endChr:93};
						var oDelimiter = new CDelimiter(props);
						this.CreateElem(oDelimiter,this);
						var delimiterBase = oDelimiter.getBase(0);
						
						var oMcs = [{count: 2, mcJc:MCJC_CENTER}];
						props = {ctrPrp: new CTextPr(), row:2, mcs: oMcs};
						var oMatrix = new CMathMatrix(props);
						this.CreateElem(oMatrix,delimiterBase);
						break;
			case 227:	props = {ctrPrp: new CTextPr(), column:1,begChr:124, endChr:124};
						var oDelimiter = new CDelimiter(props);
						this.CreateElem(oDelimiter,this);
						var delimiterBase = oDelimiter.getBase(0);
						
						var oMcs = [{count: 2, mcJc:MCJC_CENTER}];
						props = {ctrPrp: new CTextPr(), row:2, mcs: oMcs};
						var oMatrix = new CMathMatrix(props);
						this.CreateElem(oMatrix,delimiterBase);
						break;
			case 228:	props = {ctrPrp: new CTextPr(), column:1,begChr:8214, endChr:8214};
						var oDelimiter = new CDelimiter(props);
						this.CreateElem(oDelimiter,this);
						var delimiterBase = oDelimiter.getBase(0);
						
						var oMcs = [{count: 2, mcJc:MCJC_CENTER}];
						props = {ctrPrp: new CTextPr(), row:2, mcs: oMcs};
						var oMatrix = new CMathMatrix(props);
						this.CreateElem(oMatrix,delimiterBase);
						break;
			case 229:	props = {ctrPrp: new CTextPr(), column:1};
						var oDelimiter = new CDelimiter(props);
						this.CreateElem(oDelimiter,this);
						var delimiterBase = oDelimiter.getBase(0);
						
						var oMcs = [{count: 3, mcJc:MCJC_CENTER}];
						props = {ctrPrp: new CTextPr(), row:3, mcs: oMcs};
						var oMatrix = new CMathMatrix(props);
						this.CreateElem(oMatrix,delimiterBase);
						
						var oElem = oMatrix.getElement(0,0);
						oElem = oMatrix.getElement(0,1);
						var sText = String.fromCharCode(8943);
						this.AddText(oElem, sText);
						oElem = oMatrix.getElement(0,2);
						oElem = oMatrix.getElement(1,0);
						sText = String.fromCharCode(8942);
						this.AddText(oElem, sText);						
						oElem = oMatrix.getElement(1,1);
						sText = String.fromCharCode(8945);
						this.AddText(oElem, sText);						
						oElem = oMatrix.getElement(1,2);
						sText = String.fromCharCode(8942);
						this.AddText(oElem, sText);			
						oElem = oMatrix.getElement(2,0);
						oElem = oMatrix.getElement(2,1);
						sText = String.fromCharCode(8943);						
						this.AddText(oElem, sText);
						oElem = oMatrix.getElement(2,2);
						
						break;
			case 230:	props = {ctrPrp: new CTextPr(), column:1,begChr:91, endChr:93};
						var oDelimiter = new CDelimiter(props);
						this.CreateElem(oDelimiter,this);
						var delimiterBase = oDelimiter.getBase(0);
						
						var oMcs = [{count: 3, mcJc:MCJC_CENTER}];
						props = {ctrPrp: new CTextPr(), row:3, mcs: oMcs};
						var oMatrix = new CMathMatrix(props);
						this.CreateElem(oMatrix,delimiterBase);
						
						var oElem = oMatrix.getElement(0,0);
						oElem = oMatrix.getElement(0,1);
						var sText = String.fromCharCode(8943);
						this.AddText(oElem, sText);
						oElem = oMatrix.getElement(0,2);
						oElem = oMatrix.getElement(1,0);
						sText = String.fromCharCode(8942);
						this.AddText(oElem, sText);						
						oElem = oMatrix.getElement(1,1);
						sText = String.fromCharCode(8945);
						this.AddText(oElem, sText);						
						oElem = oMatrix.getElement(1,2);
						sText = String.fromCharCode(8942);
						this.AddText(oElem, sText);			
						oElem = oMatrix.getElement(2,0);
						oElem = oMatrix.getElement(2,1);
						sText = String.fromCharCode(8943);						
						this.AddText(oElem, sText);
						oElem = oMatrix.getElement(2,2);
						break;
		}
	},

    AddText : function(oElem, sText)
    {		
        if(sText)
        {			
            var MathRun = new ParaRun(this.Paragraph, true);
			
            for (var nCharPos = 0, nTextLen = sText.length; nCharPos < nTextLen; nCharPos++)
            {
                var oText = null;
				if ( 0x0026 == sText.charCodeAt(nCharPos))
					oText = new CMathAmp();
				else
				{
					oText = new CMathText(false);
					oText.addTxt(sText[nCharPos]);
				}
				MathRun.Add(oText, true);
            }

            oElem.Internal_Content_Add(oElem.CurPos + 1, MathRun, true);
        }
    },

    CreateElem : function (oElem, oParent)
    {
		oElem.Parent = oParent;

		var Pos = oParent.CurPos + 1;
        oParent.Internal_Content_Add(Pos, oElem, true);
    },

    CreateFraction : function (oFraction,oParentElem,sNumText,sDenText)
    {
        this.CreateElem(oFraction, oParentElem);

        var oElemDen = oFraction.getDenominator();		
        this.AddText(oElemDen, sDenText);

        var oElemNum = oFraction.getNumerator();
        this.AddText(oElemNum, sNumText);
    },
	
	CreateDegree : function (oDegree, oParentElem,sBaseText,sSupText,sSubText)
    {
        this.CreateElem(oDegree, oParentElem);

        var oElem = oDegree.getBase();
        this.AddText(oElem, sBaseText);

        var oSup = oDegree.getUpperIterator();
        this.AddText(oSup, sSupText);

        var oSub = oDegree.getLowerIterator();
        this.AddText(oSub, sSubText);
    },

    CreateRadical : function (oRad,oParentElem,sElemText,sDegText)
    {
        this.CreateElem(oRad, oParentElem);

        var oElem = oRad.getBase();
        this.AddText(oElem, sElemText);

        var oDeg = oRad.getDegree();
		this.AddText(oDeg, sDegText);
    },

    CreateNary : function (oNary,oParentElem,sElemText,sSubText,sSupText)
    {
        this.CreateElem(oNary, oParentElem);

        var oElem = oNary.getBase();
        this.AddText(oElem, sElemText);

        var oSub = oNary.getLowerIterator();
        this.AddText(oSub, sSubText);

        var oSup = oNary.getUpperIterator();
        this.AddText(oSup, sSupText);
    },

    CreateBox : function (oBox,oParentElem,sElemText)
    {
        this.CreateElem(oBox, oParentElem);

        var oElem = oBox.getBase();
        this.AddText(oElem, sElemText);
    }
};

CMathContent.prototype.Recalculate_Reset = function(StartRange, StartLine)
{
    for(var nPos = 0, nCount = this.content.length; nPos < nCount; nPos++)
    {
        this.content[nPos].Recalculate_Reset(StartRange, StartLine);
    }
};
CMathContent.prototype.Get_Bounds = function()
{
    var X = 0, Y = 0, W = 0, H = 0;
    if (null !== this.ParaMath)
    {
        X = this.ParaMath.X + this.pos.x;
        Y = this.ParaMath.Y + this.pos.y;
        W = this.size.width;
        H = this.size.height;
    }

    return {X : X, Y : Y, W : W, H : H};
};
CMathContent.prototype.Recalculate_CurPos = function(_X, _Y, CurrentRun, _CurRange, _CurLine, _CurPage, UpdateCurPos, UpdateTarget, ReturnTarget)
{
    var X = this.pos.x + this.ParaMath.X;
    var Y = this.pos.y + this.ParaMath.Y + this.size.ascent;

    if(this.RecalcInfo.bEqqArray)
    {
        var PointInfo = new CMathPointInfo();
        PointInfo.SetInfoPoints(this.InfoPoints);
        X += PointInfo.GetAlign();

        for(var nPos = 0; nPos < this.CurPos; nPos++)
        {
            if(para_Math_Run === this.content[nPos].Type)
                X = this.content[nPos].Recalculate_CurPos(X, Y, false, _CurRange, _CurLine, _CurPage, UpdateCurPos, UpdateTarget, ReturnTarget, PointInfo).X;
            else
                X += this.content[nPos].size.width;
        }
    }
    else
        X += this.WidthToElement[this.CurPos];

    return this.content[this.CurPos].Recalculate_CurPos(X, Y, CurrentRun, _CurRange, _CurLine, _CurPage, UpdateCurPos, UpdateTarget, ReturnTarget, PointInfo);
};
CMathContent.prototype.Get_ParaContentPosByXY = function(SearchPos, Depth, _CurLine, _CurRange, StepEnd)
{
    var nLength = this.content.length;

    if (nLength <= 0)
        return false;

    var PointInfo = new CMathPointInfo();
    PointInfo.SetInfoPoints(this.InfoPoints);

    if(this.RecalcInfo.bEqqArray)
        SearchPos.CurX += PointInfo.GetAlign();

    var bResult = false;
    for (var nPos = 0; nPos < nLength; nPos++)
    {
        var CurX = SearchPos.CurX;

        if(true === this.content[nPos].Get_ParaContentPosByXY(SearchPos, Depth + 1, _CurLine, _CurRange, StepEnd))
        {
            SearchPos.Pos.Update2(nPos, Depth);
            bResult = true;
        }

        SearchPos.CurX = CurX + this.content[nPos].size.width;
    }

    return bResult;
};
CMathContent.prototype.Get_ParaContentPos = function(bSelection, bStart, ContentPos)
{
    var nPos = (true !== bSelection ? this.CurPos : (false !== bStart ? this.Selection.Start : this.Selection.End));
    ContentPos.Add(nPos);

    if (undefined !== this.content[nPos])
        this.content[nPos].Get_ParaContentPos(bSelection, bStart, ContentPos);
};
CMathContent.prototype.Set_ParaContentPos = function(ContentPos, Depth)
{
    var CurPos = ContentPos.Get(Depth);

    // Делаем такие проверки, потому что после совместного редактирования, позиция может остаться старой, а
    // контент измениться.
    if (CurPos > this.content.length - 1)
    {
        this.CurPos = this.content.length - 1;
        this.content[this.CurPos].Cursor_MoveToEndPos(false);
    }
    else if (CurPos < 0)
    {
        this.CurPos = 0;
        this.content[this.CurPos].Cursor_MoveToStartPos();
    }
    else
    {
        this.CurPos = ContentPos.Get(Depth);
        this.content[this.CurPos].Set_ParaContentPos(ContentPos, Depth + 1);
    }
};
CMathContent.prototype.Set_SelectionContentPos = function(StartContentPos, EndContentPos, Depth, StartFlag, EndFlag)
{
    var OldStartPos = this.Selection.Start;
    var OldEndPos   = this.Selection.End;

    if (OldStartPos > OldEndPos)
    {
        OldStartPos = this.Selection.End;
        OldEndPos   = this.Selection.Start;
    }

    var StartPos = 0;
    switch(StartFlag)
    {
        case  1: StartPos = 0; break;
        case -1: StartPos = this.content.length - 1; break;
        case  0: StartPos = StartContentPos.Get(Depth); break;
    }

    var EndPos = 0;
    switch(EndFlag)
    {
        case  1: EndPos = 0; break;
        case -1: EndPos = this.content.length - 1; break;
        case  0: EndPos = EndContentPos.Get(Depth); break;
    }

    // Удалим отметки о старом селекте
    if (OldStartPos < StartPos && OldStartPos < EndPos)
    {
        var TempLimit = Math.min(StartPos, EndPos);
        for (var CurPos = OldStartPos; CurPos < TempLimit; CurPos++)
        {
            this.content[CurPos].Selection_Remove();
        }
    }

    if (OldEndPos > StartPos && OldEndPos > EndPos)
    {
        var TempLimit = Math.max(StartPos, EndPos);
        for (var CurPos = TempLimit + 1; CurPos <= OldEndPos; CurPos++)
        {
            this.content[CurPos].Selection_Remove();
        }
    }

    // Выставим метки нового селекта
    this.Selection.Use   = true;
    this.Selection.Start = StartPos;
    this.Selection.End   = EndPos;

    if (StartPos !== EndPos)
    {
        this.content[StartPos].Set_SelectionContentPos(StartContentPos, null, Depth + 1, StartFlag, StartPos > EndPos ? 1 : -1);
        this.content[EndPos].Set_SelectionContentPos(null, EndContentPos, Depth + 1, StartPos > EndPos ? -1 : 1, EndFlag);

        var _StartPos = StartPos;
        var _EndPos   = EndPos;
        var Direction = 1;

        if ( _StartPos > _EndPos )
        {
            _StartPos = EndPos;
            _EndPos   = StartPos;
            Direction = -1;
        }

        for (var CurPos = _StartPos + 1; CurPos < _EndPos; CurPos++)
        {
            this.content[CurPos].Select_All( Direction );
        }
    }
    else
    {
        this.content[StartPos].Set_SelectionContentPos(StartContentPos, EndContentPos, Depth + 1, StartFlag, EndFlag);
    }
};
CMathContent.prototype.Selection_IsEmpty = function()
{
    if (true !== this.Selection.Use)
        return true;

    if (this.Selection.Start === this.Selection.End)
        return this.content[this.Selection.Start].Selection_IsEmpty();

    return false;
};
CMathContent.prototype.GetSelectContent = function()
{
    if (false === this.Selection.Use)
    {
        if (para_Math_Composition === this.content[this.CurPos].Type)
            return this.content[this.CurPos].GetSelectContent();
        else
            return {Content : this, Start : this.CurPos, End : this.CurPos};
    }
    else
    {
        var StartPos = this.Selection.Start;
        var EndPos   = this.Selection.End;

        if (StartPos > EndPos)
        {
            StartPos = this.Selection.End;
            EndPos   = this.Selection.Start;
        }

        if (StartPos === EndPos && para_Math_Composition === this.content[StartPos].Type && true === this.content[StartPos].Is_InnerSelection())
            return this.content[StartPos].GetSelectContent();

        return {Content : this, Start : StartPos, End : EndPos};
    }
};
CMathContent.prototype.Get_LeftPos = function(SearchPos, ContentPos, Depth, UseContentPos)
{
    if (false === UseContentPos && para_Math_Run === this.content[this.content.length - 1].Type)
    {
        // При переходе в новый контент встаем в его конец
        var CurPos = this.content.length - 1;
        this.content[CurPos].Get_EndPos(false, SearchPos.Pos, Depth + 1);
        SearchPos.Pos.Update(CurPos, Depth);
        SearchPos.Found = true;

        return true;
    }

    var CurPos = UseContentPos ? ContentPos.Get(Depth) : this.content.length - 1;

    var bStepStart = false;
    if (CurPos > 0 || !this.content[0].Cursor_Is_Start())
        bStepStart = true;

    this.content[CurPos].Get_LeftPos(SearchPos, ContentPos, Depth + 1, UseContentPos);
    SearchPos.Pos.Update(CurPos, Depth);

    if (true === SearchPos.Found)
        return true;

    CurPos--;

    if (true === UseContentPos && para_Math_Composition === this.content[CurPos + 1].Type)
    {
        // При выходе из формулы встаем в конец рана
        this.content[CurPos].Get_EndPos(false, SearchPos.Pos, Depth + 1);
        SearchPos.Pos.Update(CurPos, Depth);
        SearchPos.Found = true;
        return true;
    }

    while (CurPos >= 0)
    {
        this.content[CurPos].Get_LeftPos(SearchPos, ContentPos, Depth + 1, false);
        SearchPos.Pos.Update( CurPos, Depth );

        if (true === SearchPos.Found)
            return true;

        CurPos--;
    }

    if (true === bStepStart)
    {
        // Перед выходом из контента встаем в его начало
        this.content[0].Get_StartPos(SearchPos.Pos, Depth + 1);
        SearchPos.Pos.Update(0, Depth);
        SearchPos.Found = true;

        return true;
    }

    return false;
};
CMathContent.prototype.Get_RightPos = function(SearchPos, ContentPos, Depth, UseContentPos, StepEnd)
{
    if (false === UseContentPos && para_Math_Run === this.content[0].Type)
    {
        // При переходе в новый контент встаем в его начало
        this.content[0].Get_StartPos(SearchPos.Pos, Depth + 1);
        SearchPos.Pos.Update(0, Depth);
        SearchPos.Found = true;

        return true;
    }

    var CurPos = true === UseContentPos ? ContentPos.Get(Depth) : 0;

    var Count = this.content.length;
    var bStepEnd = false;
    if (CurPos < Count - 1 || !this.content[Count - 1].Cursor_Is_End())
        bStepEnd = true;

    this.content[CurPos].Get_RightPos(SearchPos, ContentPos, Depth + 1, UseContentPos, StepEnd);
    SearchPos.Pos.Update( CurPos, Depth );

    if (true === SearchPos.Found)
        return true;

    CurPos++;

    if (true === UseContentPos && para_Math_Composition === this.content[CurPos - 1].Type)
    {
        // При выходе из формулы встаем в начало рана
        this.content[CurPos].Get_StartPos(SearchPos.Pos, Depth + 1);
        SearchPos.Pos.Update(CurPos, Depth);
        SearchPos.Found = true;
        return true;
    }

    while (CurPos < Count)
    {
        this.content[CurPos].Get_RightPos(SearchPos, ContentPos, Depth + 1, false, StepEnd);
        SearchPos.Pos.Update(CurPos, Depth);

        if (true === SearchPos.Found)
            return true;

        CurPos++;
    }

    if (true === bStepEnd)
    {
        // Перед выходом из контента встаем в его конец
        this.content[Count - 1].Get_EndPos(false, SearchPos.Pos, Depth + 1);
        SearchPos.Pos.Update(Count - 1, Depth);
        SearchPos.Found = true;

        return true;
    }

    return false;
};
CMathContent.prototype.Get_WordStartPos = function(SearchPos, ContentPos, Depth, UseContentPos)
{
    if (false === UseContentPos && para_Math_Run === this.content[this.content.length - 1].Type)
    {
        // При переходе в новый контент встаем в его конец
        var CurPos = this.content.length - 1;
        this.content[CurPos].Get_EndPos(false, SearchPos.Pos, Depth + 1);
        SearchPos.Pos.Update(CurPos, Depth);
        SearchPos.Found     = true;
        SearchPos.UpdatePos = true;
        return true;
    }

    var CurPos = true === UseContentPos ? ContentPos.Get(Depth) : this.content.length - 1;

    var bStepStart = false;
    if (CurPos > 0 || !this.content[0].Cursor_Is_Start())
        bStepStart = true;

    this.content[CurPos].Get_WordStartPos(SearchPos, ContentPos, Depth + 1, UseContentPos);

    if (true === SearchPos.UpdatePos)
        SearchPos.Pos.Update( CurPos, Depth );

    if (true === SearchPos.Found)
        return;

    CurPos--;

    var bStepStartRun = false;
    if (true === UseContentPos && para_Math_Composition === this.content[CurPos + 1].Type)
    {
        // При выходе из формулы встаем в конец рана
        this.content[CurPos].Get_EndPos(false, SearchPos.Pos, Depth + 1);
        SearchPos.Pos.Update(CurPos, Depth);
        SearchPos.Found     = true;
        SearchPos.UpdatePos = true;
        return true;
    }
    else if (para_Math_Run === this.content[CurPos + 1].Type && true === SearchPos.Shift)
        bStepStartRun = true;

    while (CurPos >= 0)
    {
        if (true !== bStepStartRun || para_Math_Run === this.content[CurPos].Type)
        {
            var OldUpdatePos = SearchPos.UpdatePos;

            this.content[CurPos].Get_WordStartPos(SearchPos, ContentPos, Depth + 1, false);

            if (true === SearchPos.UpdatePos)
                SearchPos.Pos.Update(CurPos, Depth);
            else
                SearchPos.UpdatePos = OldUpdatePos;

            if (true === SearchPos.Found)
                return;

            if (true === SearchPos.Shift)
                bStepStartRun = true;
        }
        else
        {
            // Встаем в начало рана перед формулой
            this.content[CurPos + 1].Get_StartPos(SearchPos.Pos, Depth + 1);
            SearchPos.Pos.Update(CurPos + 1, Depth);
            SearchPos.Found     = true;
            SearchPos.UpdatePos = true;
            return true;
        }
        CurPos--;
    }

    if (true === bStepStart)
    {
        // Перед выходом из контента встаем в его начало
        this.content[0].Get_StartPos(SearchPos.Pos, Depth + 1);
        SearchPos.Pos.Update(0, Depth);
        SearchPos.Found     = true;
        SearchPos.UpdatePos = true;
        return true;
    }
};
CMathContent.prototype.Get_WordEndPos = function(SearchPos, ContentPos, Depth, UseContentPos, StepEnd)
{
    if (false === UseContentPos && para_Math_Run === this.content[0].Type)
    {
        // При переходе в новый контент встаем в его начало
        this.content[0].Get_StartPos(SearchPos.Pos, Depth + 1);
        SearchPos.Pos.Update(0, Depth);
        SearchPos.Found     = true;
        SearchPos.UpdatePos = true;
        return true;
    }

    var CurPos = true === UseContentPos ? ContentPos.Get(Depth) : 0;

    var Count = this.content.length;
    var bStepEnd = false;
    if (CurPos < Count - 1 || !this.content[Count - 1].Cursor_Is_End())
        bStepEnd = true;

    this.content[CurPos].Get_WordEndPos(SearchPos, ContentPos, Depth + 1, UseContentPos, StepEnd);

    if (true === SearchPos.UpdatePos)
        SearchPos.Pos.Update( CurPos, Depth);

    if (true === SearchPos.Found)
        return;

    CurPos++;

    var bStepEndRun = false;
    if (true === UseContentPos && para_Math_Composition === this.content[CurPos - 1].Type)
    {
        // При выходе из формулы встаем в начало рана
        this.content[CurPos].Get_StartPos(SearchPos.Pos, Depth + 1);
        SearchPos.Pos.Update(CurPos, Depth);
        SearchPos.Found     = true;
        SearchPos.UpdatePos = true;
        return true;
    }
    else if (para_Math_Run === this.content[CurPos - 1].Type && true === SearchPos.Shift)
        bStepEndRun = true;

    while (CurPos < Count)
    {
        if (true !== bStepEndRun || para_Math_Run === this.content[CurPos].Type)
        {
            var OldUpdatePos = SearchPos.UpdatePos;

            this.content[CurPos].Get_WordEndPos(SearchPos, ContentPos, Depth + 1, false, StepEnd);

            if (true === SearchPos.UpdatePos)
                SearchPos.Pos.Update(CurPos, Depth);
            else
                SearchPos.UpdatePos = OldUpdatePos;

            if (true === SearchPos.Found)
                return;

            if (true === SearchPos.Shift)
                bStepEndRun = true;
        }
        else
        {
            // Встаем в конец рана перед формулой
            this.content[CurPos - 1].Get_EndPos(false, SearchPos.Pos, Depth + 1);
            SearchPos.Pos.Update(CurPos - 1, Depth);
            SearchPos.Found     = true;
            SearchPos.UpdatePos = true;
            return true;
        }

        CurPos++;
    }

    if (true === bStepEnd)
    {
        // Перед выходом из контента встаем в его конец
        this.content[Count - 1].Get_EndPos(false, SearchPos.Pos, Depth + 1);
        SearchPos.Pos.Update(Count - 1, Depth);
        SearchPos.Found     = true;
        SearchPos.UpdatePos = true;
        return true;
    }
};
CMathContent.prototype.Get_StartPos = function(ContentPos, Depth)
{
    ContentPos.Update(0, Depth);
    this.content[0].Get_StartPos(ContentPos, Depth + 1);
};
CMathContent.prototype.Get_EndPos = function(BehindEnd, ContentPos, Depth)
{
    var nLastPos = this.content.length - 1;

    ContentPos.Update(nLastPos, Depth);
    if(undefined !== this.content[nLastPos])
        this.content[nLastPos].Get_EndPos(BehindEnd, ContentPos, Depth + 1);
};
CMathContent.prototype.Selection_Remove = function()
{
    var StartPos = this.Selection.Start;
    var EndPos   = this.Selection.End;

    if (StartPos > EndPos)
    {
        StartPos = this.Selection.End;
        EndPos   = this.Selection.Start;
    }

    StartPos = Math.max(0, StartPos);
    EndPos   = Math.min(this.content.length - 1, EndPos);

    for (var nPos = StartPos; nPos <= EndPos; nPos++)
    {
        this.content[nPos].Selection_Remove();
    }

    this.Selection.Use   = false;
    this.Selection.Start = 0;
    this.Selection.End   = 0;
};
CMathContent.prototype.Select_All = function(Direction)
{
    this.Selection.Use   = true;
    this.Selection.Start = 0;
    this.Selection.End   = this.content.length - 1;

    for (var nPos = 0, nCount = this.content.length; nPos < nCount; nPos++)
    {
        this.content[nPos].Select_All(Direction);
    }
};
CMathContent.prototype.Selection_DrawRange = function(_CurLine, _CurRange, SelectionDraw)
{
    var Start = this.Selection.Start;
    var End   = this.Selection.End;

    if(Start > End)
    {
        Start = this.Selection.End;
        End   = this.Selection.Start;
    }

    SelectionDraw.StartX += this.pos.x;

    var PointsInfo = new CMathPointInfo();
    PointsInfo.SetInfoPoints(this.InfoPoints);

    if(this.RecalcInfo.bEqqArray)
    {
        if(SelectionDraw.FindStart == true)
            SelectionDraw.StartX += PointsInfo.GetAlign();
        else
            SelectionDraw.W += PointsInfo.GetAlign();
    }

    var bDrawSelection = false;
    for(var nPos = 0, nCount = this.content.length; nPos < nCount; nPos++)
    {
        bDrawSelection = nPos >= Start && nPos <= End ? true : false;

        if(para_Math_Run === this.content[nPos].Type)
            this.content[nPos].Selection_DrawRange(_CurLine, _CurRange, SelectionDraw, PointsInfo);
        else
        {
            if(true === bDrawSelection)
            {
                SelectionDraw.W += this.content[nPos].size.width;
                SelectionDraw.FindStart = false;
            }
            else if(true === SelectionDraw.FindStart)
                SelectionDraw.StartX += this.content[nPos].size.width;
        }
    }

    // Выставляем высоту селекта. В верхнем контенте высота задается параграфом
    if(true !== this.bRoot)
    {
        SelectionDraw.StartY = this.ParaMath.Y + this.pos.y;
        SelectionDraw.H      = this.size.height;
    }
};
CMathContent.prototype.Select_ElementByPos = function(nPos, bWhole)
{
    this.Selection.Use   = true;
    this.Selection.Start = nPos;
    this.Selection.End   = nPos;

    this.content[nPos].Select_All();

    if (bWhole)
        this.Correct_Selection();

    if (!this.bRoot)
        this.ParentElement.Select_MathContent(this);
    else
        this.ParaMath.bSelectionUse = true;
};
CMathContent.prototype.Select_Element = function(Element, bWhole)
{
    var nPos = -1;
    for (var nCurPos = 0, nCount = this.content.length; nCurPos < nCount; nCurPos++)
    {
        if (this.content[nCurPos] === Element)
        {
            nPos = nCurPos;
            break;
        }
    }

    if (-1 !== nPos)
    {
        this.Selection.Use   = true;
        this.Selection.Start = nPos;
        this.Selection.End   = nPos;

        if (bWhole)
            this.Correct_Selection();

        if (!this.bRoot)
            this.ParentElement.Select_MathContent(this);
        else
            this.ParaMath.bSelectionUse = true;
    }
};
CMathContent.prototype.Correct_Selection = function()
{
    if (true !== this.Selection.Use)
        return;

    // Здесь мы делаем так, чтобы селект всегда начинался и заканчивался в ране.
    // Предполагается, что контент скорректирован верно до выполнения данной функции.

    var nContentLen = this.content.length;
    var nStartPos = Math.max(0, Math.min(this.Selection.Start, nContentLen - 1));
    var nEndPos   = Math.max(0, Math.min(this.Selection.End,   nContentLen - 1));

    if (nStartPos > nEndPos)
    {
        var nTemp = nStartPos;
        nStartPos = nEndPos;
        nEndPos   = nTemp;
    }

    var oStartElement = this.content[nStartPos];
    if (para_Math_Run !== oStartElement.Type)
    {
        // Предыдущий элемент должен быть раном
        this.Selection.Start = nStartPos - 1;
        this.content[this.Selection.Start].Set_SelectionAtEndPos();
    }

    var oEndElement = this.content[nEndPos];
    if (para_Math_Run !== oEndElement.Type)
    {
        // Следующий элемент должен быть раном
        this.Selection.End = nEndPos + 1;
        this.content[this.Selection.End].Set_SelectionAtStartPos();
    }
};
CMathContent.prototype.Create_FontMap = function(Map)
{
    for (var nIndex = 0, nCount = this.content.length; nIndex < nCount; nIndex++)
        this.content[nIndex].Create_FontMap(Map, this.Compiled_ArgSz); // ArgSize компилируется только тогда, когда выставлены все ссылки на родительские классы
};
CMathContent.prototype.Get_AllFontNames = function(AllFonts)
{
    for (var nIndex = 0, nCount = this.content.length; nIndex < nCount; nIndex++)
        this.content[nIndex].Get_AllFontNames(AllFonts);
};
CMathContent.prototype.Selection_CheckParaContentPos = function(ContentPos, Depth, bStart, bEnd)
{
    var CurPos = ContentPos.Get(Depth);

    if (this.Selection.Start <= CurPos && CurPos <= this.Selection.End)
        return this.content[CurPos].Selection_CheckParaContentPos(ContentPos, Depth + 1, bStart && this.Selection.Start === CurPos, bEnd && CurPos === this.Selection.End);
    else if (this.Selection.End <= CurPos && CurPos <= this.Selection.Start)
        return this.content[CurPos].Selection_CheckParaContentPos(ContentPos, Depth + 1, bStart && this.Selection.End === CurPos, bEnd && CurPos === this.Selection.Start);

    return false;
};
CMathContent.prototype.Check_NearestPos = function(ParaNearPos, Depth)
{
    var HyperNearPos = new CParagraphElementNearPos();
    HyperNearPos.NearPos = ParaNearPos.NearPos;
    HyperNearPos.Depth   = Depth;

    this.NearPosArray.push(HyperNearPos);
    ParaNearPos.Classes.push(this);

    var CurPos = ParaNearPos.NearPos.ContentPos.Get(Depth);
    this.content[CurPos].Check_NearestPos(ParaNearPos, Depth + 1);
};
CMathContent.prototype.private_SetNeedResize = function()
{
    if (null !== this.ParaMath)
        this.ParaMath.SetNeedResize();
};
CMathContent.prototype.Is_CheckingNearestPos  = ParaHyperlink.prototype.Is_CheckingNearestPos;
CMathContent.prototype.Get_SelectionDirection = function()
{
    if (true !== this.Selection.Use)
        return 0;

    if (this.Selection.Start < this.Selection.End)
        return 1;
    else if (this.Selection.Start > this.Selection.End)
        return -1;

    return this.content[this.Selection.Start].Get_SelectionDirection();
};
CMathContent.prototype.Process_AutoCorrect = function(ActionElement)
{
    if (false === this.private_NeedAutoCorrect(ActionElement))
        return;

    var AutoCorrectEngine = new CMathAutoCorrectEngine(ActionElement);

    var nCount = this.content.length;
    for (var nPos = 0; nPos < nCount; nPos++)
    {
        var Element = this.content[nPos];

        if (para_Math_Run === Element.Type)
            Element.Get_TextForAutoCorrect(AutoCorrectEngine, nPos);
        else
            AutoCorrectEngine.Add_Element(Element, nPos);

        if (false === AutoCorrectEngine.CollectText)
            break;
    }

    // Создаем новую точку здесь, потому что если автозамену можно будет сделать классы сразу будут создаваться
    History.Create_NewPoint();

    var bCursorStepRight = false;
    // Смотрим возможно ли выполнить автозамену, если нет, тогда пробуем произвести автозамену пропуская последний символ
    var CanMakeAutoCorrect = this.private_CanAutoCorrectText(AutoCorrectEngine, false);

    if (false === CanMakeAutoCorrect)
    {
        // Пробуем произвести автозамену без последнего добавленного символа
        if (0x20 === ActionElement.value)
            CanMakeAutoCorrect = this.private_CanAutoCorrectText(AutoCorrectEngine, true);
        else
        {
            AutoCorrectEngine.Elements.splice(AutoCorrectEngine.Elements.length - 1, 1);
            CanMakeAutoCorrect = this.private_CanAutoCorrectText(AutoCorrectEngine, false);
            bCursorStepRight = true;
        }
    }

    // Пробуем сделать формульную автозамену
    if (false === CanMakeAutoCorrect)
    {
        CanMakeAutoCorrect = this.private_CanAutoCorrectEquation(AutoCorrectEngine);
    }

    if (true === CanMakeAutoCorrect)
    {
        var ElementsCount = AutoCorrectEngine.Elements.length;
        var LastElement = null;

        var FirstElement    = AutoCorrectEngine.Elements[ElementsCount - 1];
        var FirstElementPos = FirstElement.ElementPos;
        FirstElement.Pos++;
        for (var nPos = 0, nCount = AutoCorrectEngine.RemoveCount; nPos < nCount; nPos++)
        {
            LastElement = AutoCorrectEngine.Elements[ElementsCount - nPos - 1];

            if (undefined !== LastElement.Run)
            {
                if (FirstElement.Run === LastElement.Run)
                    FirstElement.Pos--;

                LastElement.Run.Remove_FromContent(LastElement.Pos, 1);
            }
            else
            {
                this.Remove_FromContent(LastElement.ElementPos, 1);
                FirstElementPos--;
            }
        }

        var NewRun = FirstElement.Run.Split2(FirstElement.Pos);

        this.Internal_Content_Add(FirstElementPos + 1, NewRun, false);

        var NewElementsCount = AutoCorrectEngine.ReplaceContent.length;
        for (var nPos = 0; nPos < NewElementsCount; nPos++)
        {
            this.Internal_Content_Add(nPos + FirstElementPos + 1, AutoCorrectEngine.ReplaceContent[nPos], false);
        }

        this.CurPos = FirstElementPos + NewElementsCount + 1;
        this.content[this.CurPos].Cursor_MoveToStartPos();

        if (true === bCursorStepRight)
        {
            // TODO: Переделать через функцию в ране
            if (this.content[this.CurPos].Content.length >= 1)
                this.content[this.CurPos].State.ContentPos = 1;
        }
    }
    else
    {
        History.Remove_LastPoint();
    }
};

CMathContent.prototype.private_NeedAutoCorrect = function(ActionElement)
{
    var CharCode = ActionElement.value;
    if (1 === g_aMathAutoCorrectTriggerCharCodes[CharCode])
        return true;

    return false;
};

CMathContent.prototype.private_CanAutoCorrectText = function(AutoCorrectionEngine, bSkipLast)
{
    var IndexAdd = (true === bSkipLast ? 1 : 0);

    var ElementsCount = AutoCorrectionEngine.Elements.length;
    if (ElementsCount < 2 + IndexAdd)
        return false;

    var Result = false;

    var RemoveCount = 0;
    var ReplaceChar = ' ';
    var AutoCorrectCount = g_aAutoCorrectMathSymbols.length;
    for (var nIndex = 0; nIndex < AutoCorrectCount; nIndex++)
    {
        var AutoCorrectElement = g_aAutoCorrectMathSymbols[nIndex];
        var CheckString = AutoCorrectElement[0];
        var CheckStringLen = CheckString.length;

        if (ElementsCount < CheckStringLen)
            continue;

        var Found = true;

        // Начинаем проверять с конца строки
        for (var nStringPos = 0; nStringPos < CheckStringLen; nStringPos++)
        {
            var LastElement = AutoCorrectionEngine.Elements[ElementsCount - nStringPos - 1 - IndexAdd];
            if (undefined === LastElement.Text || LastElement.Text !== CheckString.charAt(CheckStringLen - nStringPos - 1))
            {
                Found = false;
                break;
            }
        }

        if (true === Found)
        {
            RemoveCount = CheckStringLen + IndexAdd;
            ReplaceChar = AutoCorrectElement[1];
        }
    }

    if (RemoveCount > 0)
    {
        var ReplaceText = new CMathText();
        ReplaceText.add(ReplaceChar);

        var MathRun = new ParaRun(this.ParaMath.Paragraph, true);
        MathRun.Add(ReplaceText, true);

        AutoCorrectionEngine.RemoveCount = RemoveCount;
        AutoCorrectionEngine.ReplaceContent.push(MathRun);

        Result = true;
    }

    return Result;
};

CMathContent.prototype.private_CanAutoCorrectEquation = function(AutoCorrectionEngine)
{
    var ElementsCount = AutoCorrectionEngine.Elements.length;
    if (ElementsCount < 2)
        return false;

    var TempElements = [];
    var CurPos = ElementsCount - 1;

    // Пробел в начале пропускаем
    var Element = AutoCorrectionEngine.Elements[CurPos];
    if (' ' === Element.Text)
        CurPos--;

    while (CurPos >= 0)
    {
        var Element = AutoCorrectionEngine.Elements[CurPos];
        if (undefined === Element.Text)
            TempElements.splice(0, 0, Element);
        else if ('/' === Element.Text)
        {
            CurPos--;
            break;
        }
        else if (g_aMathAutoCorrectTriggerCharCodes[Element.Text.charCodeAt(0)])
            return false;
        else
            TempElements.splice(0, 0, Element);

        CurPos--;
    }

    var TempElements2 = [];
    while (CurPos >= 0)
    {
        var Element = AutoCorrectionEngine.Elements[CurPos];
        if (undefined === Element.Text)
            TempElements2.splice(0, 0, Element);
        else if (g_aMathAutoCorrectTriggerCharCodes[Element.Text.charCodeAt(0)])
            break;
        else
            TempElements2.splice(0, 0, Element);

        CurPos--;
    }

    if (TempElements2.length > 0)
    {
        var Fraction = new CFraction(new CMathFractionPr());

        var DenMathContent = Fraction.Content[0];
        var NumMathContent = Fraction.Content[1];

        for (var nPos = 0; nPos < TempElements2.length; nPos++)
        {
            if (undefined === TempElements2[nPos].Text)
                DenMathContent.Internal_Content_Add(nPos, TempElements2[nPos].Element);
            else
            {
                var MathRun = new ParaRun(this.ParaMath.Paragraph, true);
                var MathText = new CMathText();
                MathText.add(TempElements2[nPos].Text.charCodeAt(0));
                MathRun.Add_ToContent(nPos, MathText);
                DenMathContent.Internal_Content_Add(nPos, MathRun);
            }
        }

        for (var nPos = 0; nPos < TempElements.length; nPos++)
        {
            if (undefined === TempElements[nPos].Text)
                NumMathContent.Internal_Content_Add(nPos, TempElements[nPos]);
            else
            {
                var MathRun = new ParaRun(this.ParaMath.Paragraph, true);
                var MathText = new CMathText();
                MathText.add(TempElements[nPos].Text.charCodeAt(0));
                MathRun.Add_ToContent(nPos, MathText);
                NumMathContent.Internal_Content_Add(nPos, MathRun);
            }
        }

        AutoCorrectionEngine.RemoveCount = ElementsCount - CurPos - 1;
        AutoCorrectionEngine.ReplaceContent.push(Fraction);

        return true;
    }

    return false;
};

function CMathAutoCorrectEngine(Element)
{
    this.ActionElement  = Element; // Элемент на которотом срабатывает автодополнение
    this.Elements       = [];

    this.CollectText    = true;

    this.RemoveCount    = 0;
    this.ReplaceContent = [];
}

CMathAutoCorrectEngine.prototype.Add_Element = function(Element, ElementPos)
{
    this.Elements.push({Element : Element, ElementPos : ElementPos});
};

CMathAutoCorrectEngine.prototype.Add_Text = function(Text, Run, Pos, ElementPos)
{
    this.Elements.push({Text : Text, Run : Run, Pos : Pos, ElementPos : ElementPos});
};

CMathAutoCorrectEngine.prototype.Get_ActionElement = function()
{
    return this.ActionElement;
};

CMathAutoCorrectEngine.prototype.Stop_CollectText = function()
{
    this.CollectText = false;
};

var g_aAutoCorrectMathSymbols =
[
        ['!!', 0x203C],
        ['...', 0x2026],
        ['::', 0x2237],
        [':=', 0x2254],
        ['\\above', 0x2534],
        ['\\acute', 0x0301],
        ['\\aleph', 0x2135],
        ['\\alpha', 0x03B1],
        ['\\Alpha', 0x0391],
        ['\\amalg', 0x2210],
        ['\\angle', 0x2220],
        ['\\aoint', 0x2233],
        ['\\approx', 0x2248],
        ['\\asmash', 0x2B06],
        ['\\ast', 0x2217],
        ['\\asymp', 0x224D],
        ['\\atop', 0x00A6],
        ['\\bar', 0x0305],
        ['\\Bar', 0x033F],
        ['\\because', 0x2235],
        ['\\begin', 0x3016],
        ['\\below', 0x252C],
        ['\\bet', 0x2136],
        ['\\beta', 0x03B2],
        ['\\Beta', 0x0392],
        ['\\beth', 0x2136],
        ['\\bigcap', 0x22C2],
        ['\\bigcup', 0x22C3],
        ['\\bigodot', 0x2A00],
        ['\\bigoplus', 0x2A01],
        ['\\bigotimes', 0x2A02],
        ['\\bigsqcup', 0x2A06],
        ['\\biguplus', 0x2A04],
        ['\\bigvee', 0x22C1],
        ['\\bigwedge', 0x22C0],
        ['\\bot', 0x22A5],
        ['\\bowtie', 0x22C8],
        ['\\box', 0x25A1],
        ['\\bra', 0x27E8],
        ['\\breve', 0x0306],
        ['\\bullet', 0x2219],
        ['\\cap', 0x2229],
        ['\\cbrt', 0x221B],
        ['\\cdot', 0x22C5],
        ['\\cdots', 0x22EF],
        ['\\check', 0x030C],
        ['\\chi', 0x03C7],
        ['\\Chi', 0x03A7],
        ['\\circ', 0x2218],
        ['\\close', 0x2524],
        ['\\clubsuit', 0x2663],
        ['\\coint', 0x2232],
        ['\\cong', 0x2245],
        ['\\coprod', 0x2210],
        ['\\cup', 0x222A],
        ['\\dalet', 0x2138],
        ['\\daleth', 0x2138],
        ['\\dashv', 0x22A3],
        ['\\dd', 0x2146],
        ['\\Dd', 0x2145],
        ['\\ddddot', 0x20DC],
        ['\\dddot', 0x20DB],
        ['\\ddot', 0x0308],
        ['\\ddots', 0x22F1],
        ['\\degree', 0x00B0],
        ['\\delta', 0x03B4],
        ['\\Delta', 0x0394],
        ['\\diamond', 0x22C4],
        ['\\diamondsuit', 0x2662],
        ['\\div', 0x00F7],
        ['\\dot', 0x0307],
        ['\\doteq', 0x2250],
        ['\\dots', 0x2026],
        ['\\doublea', 0x1D552],
        ['\\doubleA', 0x1D538],
        ['\\doubleb', 0x1D553],
        ['\\doubleB', 0x1D539],
        ['\\doublec', 0x1D554],
        ['\\doubleC', 0x2102],
        ['\\doubled', 0x1D555],
        ['\\doubleD', 0x1D53B],
        ['\\doublee', 0x1D556],
        ['\\doubleE', 0x1D53C],
        ['\\doublef', 0x1D557],
        ['\\doubleF', 0x1D53D],
        ['\\doubleg', 0x1D558],
        ['\\doubleG', 0x1D53E],
        ['\\doubleh', 0x1D559],
        ['\\doubleH', 0x210D],
        ['\\doublei', 0x1D55A],
        ['\\doubleI', 0x1D540],
        ['\\doublej', 0x1D55B],
        ['\\doubleJ', 0x1D541],
        ['\\doublek', 0x1D55C],
        ['\\doubleK', 0x1D542],
        ['\\doublel', 0x1D55D],
        ['\\doubleL', 0x1D543],
        ['\\doublem', 0x1D55E],
        ['\\doubleM', 0x1D544],
        ['\\doublen', 0x1D55F],
        ['\\doubleN', 0x2115],
        ['\\doubleo', 0x1D560],
        ['\\doubleO', 0x1D546],
        ['\\doublep', 0x1D561],
        ['\\doubleP', 0x2119],
        ['\\doubleq', 0x1D562],
        ['\\doubleQ', 0x211A],
        ['\\doubler', 0x1D563],
        ['\\doubleR', 0x211D],
        ['\\doubles', 0x1D564],
        ['\\doubleS', 0x1D54A],
        ['\\doublet', 0x1D565],
        ['\\doubleT', 0x1D54B],
        ['\\doubleu', 0x1D566],
        ['\\doubleU', 0x1D54C],
        ['\\doublev', 0x1D567],
        ['\\doubleV', 0x1D54D],
        ['\\doublew', 0x1D568],
        ['\\doubleW', 0x1D54E],
        ['\\doublex', 0x1D569],
        ['\\doubleX', 0x1D54F],
        ['\\doubley', 0x1D56A],
        ['\\doubleY', 0x1D550],
        ['\\doublez', 0x1D56B],
        ['\\doubleZ', 0x2124],
        ['\\downarrow', 0x2193],
        ['\\Downarrow', 0x21D3],
        ['\\dsmash', 0x2B07],
        ['\\ee', 0x2147],
        ['\\ell', 0x2113],
        ['\\emptyset', 0x2205],
        ['\\end', 0x3017],
        ['\\ensp', 0x2002],
        ['\\epsilon', 0x03F5],
        ['\\Epsilon', 0x0395],
        ['\\eqarray', 0x2588],
        ['\\equiv', 0x2261],
        ['\\eta', 0x03B7],
        ['\\Eta', 0x0397],
        ['\\exists', 0x2203],
        ['\\forall', 0x2200],
        ['\\fraktura', 0x1D51E],
        ['\\frakturA', 0x1D504],
        ['\\frakturb', 0x1D51F],
        ['\\frakturB', 0x1D505],
        ['\\frakturc', 0x1D520],
        ['\\frakturC', 0x212D],
        ['\\frakturd', 0x1D521],
        ['\\frakturD', 0x1D507],
        ['\\frakture', 0x1D522],
        ['\\frakturE', 0x1D508],
        ['\\frakturf', 0x1D523],
        ['\\frakturF', 0x1D509],
        ['\\frakturg', 0x1D524],
        ['\\frakturG', 0x1D50A],
        ['\\frakturh', 0x1D525],
        ['\\frakturH', 0x210C],
        ['\\frakturi', 0x1D526],
        ['\\frakturI', 0x2111],
        ['\\frakturj', 0x1D527],
        ['\\frakturJ', 0x1D50D],
        ['\\frakturk', 0x1D528],
        ['\\frakturK', 0x1D50E],
        ['\\frakturl', 0x1D529],
        ['\\frakturL', 0x1D50F],
        ['\\frakturm', 0x1D52A],
        ['\\frakturM', 0x1D510],
        ['\\frakturn', 0x1D52B],
        ['\\frakturN', 0x1D511],
        ['\\frakturo', 0x1D52C],
        ['\\frakturO', 0x1D512],
        ['\\frakturp', 0x1D52D],
        ['\\frakturP', 0x1D513],
        ['\\frakturq', 0x1D52E],
        ['\\frakturQ', 0x1D514],
        ['\\frakturr', 0x1D52F],
        ['\\frakturR', 0x211C],
        ['\\frakturs', 0x1D530],
        ['\\frakturS', 0x1D516],
        ['\\frakturt', 0x1D531],
        ['\\frakturT', 0x1D517],
        ['\\frakturu', 0x1D532],
        ['\\frakturU', 0x1D518],
        ['\\frakturv', 0x1D533],
        ['\\frakturV', 0x1D519],
        ['\\frakturw', 0x1D534],
        ['\\frakturW', 0x1D51A],
        ['\\frakturx', 0x1D535],
        ['\\frakturX', 0x1D51B],
        ['\\fraktury', 0x1D536],
        ['\\frakturY', 0x1D51C],
        ['\\frakturz', 0x1D537],
        ['\\frakturZ', 0x2128],
        ['\\funcapply', 0x2061],
        ['\\gamma', 0x03B3],
        ['\\Gamma', 0x0393],
        ['\\ge', 0x2265],
        ['\\geq', 0x2265],
        ['\\gets', 0x2190],
        ['\\gg', 0x226B],
        ['\\gimel', 0x2137],
        ['\\grave', 0x0300],
        ['\\hairsp', 0x200A],
        ['\\hat', 0x0302],
        ['\\hbar', 0x210F],
        ['\\heartsuit', 0x2661],
        ['\\hookleftarrow', 0x21A9],
        ['\\hookrightarrow', 0x21AA],
        ['\\hphantom', 0x2B04],
        ['\\hvec', 0x20D1],
        ['\\ii', 0x2148],
        ['\\iiint', 0x222D],
        ['\\iint', 0x222C],
        ['\\Im', 0x2111],
        ['\\in', 0x2208],
        ['\\inc', 0x2206],
        ['\\infty', 0x221E],
        ['\\int', 0x222B],
        ['\\iota', 0x03B9],
        ['\\Iota', 0x0399],
        ['\\jj', 0x2149],
        ['\\kappa', 0x03BA],
        ['\\Kappa', 0x039A],
        ['\\ket', 0x27E9],
        ['\\lambda', 0x03BB],
        ['\\Lambda', 0x039B],
        ['\\langle', 0x2329],
        ['\\lbrace', 0x007B],
        ['\\lbrack', 0x005B],
        ['\\lceil', 0x2308],
        ['\\ldiv', 0x2215],
        ['\\ldivide', 0x2215],
        ['\\ldots', 0x2026],
        ['\\le', 0x2264],
        ['\\left', 0x251C],
        ['\\leftarrow', 0x2190],
        ['\\Leftarrow', 0x21D0],
        ['\\leftharpoondown', 0x21BD],
        ['\\leftharpoonup', 0x21BC],
        ['\\leftrightarrow', 0x2194],
        ['\\Leftrightarrow', 0x21D4],
        ['\\leq', 0x2264],
        ['\\lfloor', 0x230A],
        ['\\ll', 0x226A],
        ['\\mapsto', 0x21A6],
        ['\\matrix', 0x25A0],
        ['\\medsp', 0x205F],
        ['\\mid', 0x2223],
        ['\\models', 0x22A8],
        ['\\mp', 0x2213],
        ['\\mu', 0x03BC],
        ['\\Mu', 0x039C],
        ['\\nabla', 0x2207],
        ['\\naryand', 0x2592],
        ['\\nbsp', 0x00A0],
        ['\\ne', 0x2260],
        ['\\nearrow', 0x2197],
        ['\\neq', 0x2260],
        ['\\ni', 0x220B],
        ['\\norm', 0x2016],
        ['\\notcontain', 0x220C],
        ['\\notelement', 0x2209],
        ['\\nu', 0x03BD],
        ['\\Nu', 0x039D],
        ['\\nwarrow', 0x2196],
        ['\\o', 0x03BF],
        ['\\O', 0x039F],
        ['\\odot', 0x2299],
        ['\\of', 0x2592],
        ['\\oiiint', 0x2230],
        ['\\oiint', 0x222F],
        ['\\oint', 0x222E],
        ['\\omega', 0x03C9],
        ['\\Omega', 0x03A9],
        ['\\ominus', 0x2296],
        ['\\open', 0x251C],
        ['\\oplus', 0x2295],
        ['\\otimes', 0x2297],
        ['\\over', 0x002F],
        ['\\overbar', 0x00AF],
        ['\\overbrace', 0x23DE],
        ['\\overparen', 0x23DC],
        ['\\parallel', 0x2225],
        ['\\partial', 0x2202],
        ['\\phantom', 0x27E1],
        ['\\phi', 0x03D5],
        ['\\Phi', 0x03A6],
        ['\\pi', 0x03C0],
        ['\\Pi', 0x03A0],
        ['\\pm', 0x00B1],
        ['\\pppprime', 0x2057],
        ['\\ppprime', 0x2034],
        ['\\pprime', 0x2033],
        ['\\prec', 0x227A],
        ['\\preceq', 0x227C],
        ['\\prime', 0x2032],
        ['\\prod', 0x220F],
        ['\\propto', 0x221D],
        ['\\psi', 0x03C8],
        ['\\Psi', 0x03A8],
        ['\\qdrt', 0x221C],
        // TODO: \\quadratic
        ['\\rangle', 0x232A],
        ['\\ratio', 0x2236],
        ['\\rbrace', 0x007D],
        ['\\rbrack', 0x005D],
        ['\\rceil', 0x2309],
        ['\\rddots', 0x22F0],
        ['\\Re', 0x211C],
        ['\\rect', 0x25AD],
        ['\\rfloor', 0x230B],
        ['\\rho', 0x03C1],
        ['\\Rho', 0x03A1],
        ['\\right', 0x2524],
        ['\\rightarrow', 0x2192],
        ['\\Rightarrow', 0x21D2],
        ['\\rightharpoondown', 0x21C1],
        ['\\rightharpoonup', 0x21C0],
        ['\\scripta', 0x1D4B6],
        ['\\scriptA', 0x1D49C],
        ['\\scriptb', 0x1D4B7],
        ['\\scriptB', 0x212C],
        ['\\scriptc', 0x1D4B8],
        ['\\scriptC', 0x1D49E],
        ['\\scriptd', 0x1D4B9],
        ['\\scriptD', 0x1D49F],
        ['\\scripte', 0x212F],
        ['\\scriptE', 0x2130],
        ['\\scriptf', 0x1D4BB],
        ['\\scriptF', 0x2131],
        ['\\scriptg', 0x210A],
        ['\\scriptG', 0x1D4A2],
        ['\\scripth', 0x1D4BD],
        ['\\scriptH', 0x210B],
        ['\\scripti', 0x1D4BE],
        ['\\scriptI', 0x2110],
        ['\\scriptj', 0x1D4BF],
        ['\\scriptJ', 0x1D4A5],
        ['\\scriptk', 0x1D4C0],
        ['\\scriptK', 0x1D4A6],
        ['\\scriptl', 0x2113],
        ['\\scriptL', 0x2112],
        ['\\scriptm', 0x1D4C2],
        ['\\scriptM', 0x2133],
        ['\\scriptn', 0x1D4C3],
        ['\\scriptN', 0x1D4A9],
        ['\\scripto', 0x2134],
        ['\\scriptO', 0x1D4AA],
        ['\\scriptp', 0x1D4C5],
        ['\\scriptP', 0x1D4AB],
        ['\\scriptq', 0x1D4C6],
        ['\\scriptQ', 0x1D4AC],
        ['\\scriptr', 0x1D4C7],
        ['\\scriptR', 0x211B],
        ['\\scripts', 0x1D4C8],
        ['\\scriptS', 0x1D4AE],
        ['\\scriptt', 0x1D4C9],
        ['\\scriptT', 0x1D4AF],
        ['\\scriptu', 0x1D4CA],
        ['\\scriptU', 0x1D4B0],
        ['\\scriptv', 0x1D4CB],
        ['\\scriptV', 0x1D4B1],
        ['\\scriptw', 0x1D4CC],
        ['\\scriptW', 0x1D4B2],
        ['\\scriptx', 0x1D4CD],
        ['\\scriptX', 0x1D4B3],
        ['\\scripty', 0x1D4CE],
        ['\\scriptY', 0x1D4B4],
        ['\\scriptz', 0x1D4CF],
        ['\\scriptZ', 0x1D4B5],
        ['\\sdiv', 0x2044],
        ['\\sdivide', 0x2044],
        ['\\searrow', 0x2198],
        ['\\setminus', 0x2216],
        ['\\sigma', 0x03C3],
        ['\\Sigma', 0x03A3],
        ['\\sim', 0x223C],
        ['\\simeq', 0x2243],
        ['\\smash', 0x2B0D],
        ['\\spadesuit', 0x2660],
        ['\\sqcap', 0x2293],
        ['\\sqcup', 0x2294],
        ['\\sqrt', 0x221A],
        ['\\sqsubseteq', 0x2291],
        ['\\sqsuperseteq', 0x2292],
        ['\\star', 0x22C6],
        ['\\subset', 0x2282],
        ['\\subseteq', 0x2286],
        ['\\succ', 0x227B],
        ['\\succeq', 0x227D],
        ['\\sum', 0x2211],
        ['\\superset', 0x2283],
        ['\\superseteq', 0x2287],
        ['\\swarrow', 0x2199],
        ['\\tau', 0x03C4],
        ['\\Tau', 0x03A4],
        ['\\therefore', 0x2234],
        ['\\theta', 0x03B8],
        ['\\Theta', 0x0398],
        ['\\thicksp', 0x2005],
        ['\\thinsp', 0x2006],
        ['\\tilde', 0x0303],
        ['\\times', 0x00D7],
        ['\\to', 0x2192],
        ['\\top', 0x22A4],
        ['\\tvec', 0x20E1],
        ['\\ubar', 0x0332],
        ['\\Ubar', 0x0333],
        ['\\underbar', 0x2581],
        ['\\underbrace', 0x23DF],
        ['\\underparen', 0x23DD],
        ['\\uparrow', 0x2191],
        ['\\Uparrow', 0x21D1],
        ['\\updownarrow', 0x2195],
        ['\\Updownarrow', 0x21D5],
        ['\\uplus', 0x228E],
        ['\\upsilon', 0x03C5],
        ['\\Upsilon', 0x03A5],
        ['\\varepsilon', 0x03B5],
        ['\\varphi', 0x03C6],
        ['\\varpi', 0x03D6],
        ['\\varrho', 0x03F1],
        ['\\varsigma', 0x03C2],
        ['\\vartheta', 0x03D1],
        ['\\vbar', 0x2502],
        ['\\vdash', 0x22A2],
        ['\\vdots', 0x22EE],
        ['\\vec', 0x20D7],
        ['\\vee', 0x2228],
        ['\\vert', 0x007C],
        ['\\Vert', 0x2016],
        ['\\vphantom', 0x21F3],
        ['\\vthicksp', 0x2004],
        ['\\wedge', 0x2227],
        ['\\wp', 0x2118],
        ['\\wr', 0x2240],
        ['\\xi', 0x03BE],
        ['\\Xi', 0x039E],
        ['\\zeta', 0x03B6],
        ['\\Zeta', 0x0396],
        ['\\zwnj', 0x200C],
        ['\\zwsp', 0x200B],
        ['~=', 0x2245],
        ['-+', 0x2213],
        ['+-', 0x00B1],
        ['<<', 0x226A],
        ['<=', 0x2264],
        ['->', 0x2192],
        ['>=', 0x2265],
        ['>>', 0x226B]
];

var g_aMathAutoCorrectTriggerCharCodes =
{
    0x20 : 1, 0x21 : 1, 0x22 : 1, 0x23 : 1, 0x24 : 1, 0x25 : 1, 0x26 : 1,
    0x27 : 1, 0x28 : 1, 0x29 : 1, 0x2A : 1, 0x2B : 1, 0x2C : 1, 0x2D : 1,
    0x2E : 1, 0x2F : 1, 0x3A : 1, 0x3B : 1, 0x3C : 1, 0x3D : 1, 0x3E : 1,
    0x3F : 1, 0x40 : 1, 0x5B : 1, 0x5C : 1, 0x5D : 1, 0x5E : 1, 0x5F : 1,
    0x60 : 1, 0x7B : 1, 0x7C : 1, 0x7D : 1, 0x7E : 1
};

